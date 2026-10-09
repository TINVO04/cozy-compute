import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { copyFile, lstat, mkdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  atomicJson,
  control,
  environment,
  pnpm,
  ready,
  run,
  settings,
  startSupervisor,
  within,
} from './windows-common.mjs';

export async function backup(config) {
  const directory = join(config.root, 'backups');
  await mkdir(directory, { recursive: true });
  const file = join(directory, `cozy-${new Date().toISOString().replace(/[:.]/g, '-')}.sql.gz`);
  const url = new URL(config.values.DATABASE_URL);
  const child = spawn(
    config.values.PG_DUMP_EXECUTABLE,
    [
      '--no-owner',
      '--host',
      url.hostname,
      '--port',
      url.port,
      '--username',
      decodeURIComponent(url.username),
      '--dbname',
      url.pathname.slice(1),
    ],
    {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
    },
  );
  // Do not print PostgreSQL connection details or passwords on failure.
  child.stderr.resume();
  const completed = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => (code === 0 ? resolve() : reject(new Error('PostgreSQL backup failed.'))));
  });
  await Promise.all([
    completed,
    pipeline(child.stdout, createGzip(), createWriteStream(file, { flags: 'wx', mode: 0o600 })),
  ]);
  console.log(`Database backup: ${file}`);
  return file;
}

export async function deployWindows({ source = process.cwd(), local = false } = {}) {
  if (process.platform !== 'win32') throw new Error('Native deployment requires a Windows runner.');
  const config = await settings();
  if (within(source, config.root) || within(config.root, source))
    throw new Error('Production directory must be separate from Git.');
  if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_SHA && process.env.GITHUB_TOKEN) {
    const response = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/git/ref/heads/master`,
      {
        headers: {
          authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          accept: 'application/vnd.github+json',
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) throw new Error('Cannot verify current master commit.');
    if ((await response.json()).object.sha !== process.env.GITHUB_SHA) {
      console.log('Skipping superseded commit.');
      return;
    }
  }
  if (!local) {
    run('git', ['diff', '--quiet', 'HEAD'], source);
    if (run('git', ['ls-files', '--others', '--exclude-standard'], source, undefined, true))
      throw new Error('Commit untracked files before production deployment.');
  }
  const sha = run('git', ['rev-parse', 'HEAD'], source, undefined, true);
  if (process.env.GITHUB_SHA && (process.env.GITHUB_SHA !== sha || local))
    throw new Error('Deploy must match the tested commit.');
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid commit.');
  const version = sha + (local ? `-local-${Date.now()}` : '');
  const release = join(config.root, 'releases', version);
  const lock = join(config.root, '.deploy-lock');
  await mkdir(lock);
  let previous,
    activated = false;
  try {
    try {
      previous = JSON.parse(await readFile(join(config.root, 'deployment.json'), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (!local && previous?.version === version) {
      const runtime = await startSupervisor(config);
      if (runtime.version !== version) await control(config, '/activate', { version });
      await ready(`https://${config.values.GAME_DOMAIN}`, version);
      console.log(`Release ${version} is already deployed and publicly healthy.`);
      return;
    }
    try {
      await lstat(release);
      await rm(release, { recursive: true, force: true });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await mkdir(release, { recursive: true });
    const files = run('git', ['ls-files', '-z'], source, undefined, true).split('\0').filter(Boolean);
    if (local)
      files.push(
        ...run('git', ['ls-files', '--others', '--exclude-standard', '-z'], source, undefined, true)
          .split('\0')
          .filter(Boolean),
      );
    for (const file of new Set(files)) {
      const input = resolve(source, file),
        output = resolve(release, file);
      if (!within(source, input) || !within(release, output) || !(await lstat(input)).isFile())
        throw new Error('Unsafe release file.');
      await mkdir(resolve(output, '..'), { recursive: true });
      await copyFile(input, output);
    }
    const env = environment(config, release);
    // Public URLs are build-time values; no credentials are written into the frontend.
    pnpm(['install', '--frozen-lockfile', '--prod=false'], release, env);
    pnpm(['build'], release, { ...env, VITE_API_URL: '/api', VITE_REALTIME_URL: '/realtime' });
    await writeFile(join(release, 'apps/web/dist/version.txt'), version + '\n');
    run(
      config.values.CADDY_EXECUTABLE,
      ['validate', '--config', join(release, 'infra/caddy/Windows.Caddyfile'), '--adapter', 'caddyfile'],
      release,
      env,
      true,
    );
    await backup(config);
    await mkdir(join(config.root, 'manager'), { recursive: true });
    // The running supervisor keeps its loaded implementation until its next restart.
    for (const file of [
      'windows-common.mjs',
      'windows-supervisor.mjs',
      'windows-backup.mjs',
      'windows-deploy.mjs',
    ])
      await copyFile(join(release, 'infra/deploy', file), join(config.root, 'manager', file));
    const runtime = await startSupervisor(config);
    if (runtime.version) previous = { version: runtime.version };
    activated = true;
    await control(config, '/activate', { version });
    if (!local) await ready(`https://${config.values.GAME_DOMAIN}`, version);
    await atomicJson(join(config.root, local ? 'local-deployment.json' : 'deployment.json'), {
      version,
      sha,
      deployedAt: new Date().toISOString(),
      publicVerified: !local,
    });
    console.log(
      local
        ? `Local production verified: http://127.0.0.1:${config.values.PROXY_PORT}; public domain has not been verified.`
        : `Deployed ${sha}: https://${config.values.GAME_DOMAIN}`,
    );
  } catch (error) {
    if (activated && previous?.version) {
      try {
        await control(config, '/activate', { version: previous.version });
        console.log('Previous release restored; database backup retained.');
      } catch {
        console.error('Rollback failed. Check production logs.');
      }
    }
    throw error;
  } finally {
    await rmdir(lock);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  deployWindows({ local: process.argv.includes('--local') }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
