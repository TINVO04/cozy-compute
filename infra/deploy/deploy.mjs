import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { access, copyFile, lstat, mkdir, readFile, rename, rmdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { parseEnv } from 'node:util';
import { createGzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';

function run(command, args, cwd, env, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    windowsHide: true,
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
  if (result.error || result.status !== 0)
    throw new Error(`${command} failed (exit ${result.status ?? 'unknown'}).`);
  return result.stdout?.trim() ?? '';
}

function within(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

async function copyTrackedRelease(source, release, files) {
  for (const file of files) {
    const input = resolve(source, file),
      output = resolve(release, file);
    if (!within(source, input) || !within(release, output))
      throw new Error('A tracked path escapes the release directory.');
    if (!(await lstat(input)).isFile())
      throw new Error('Deployment expects ordinary tracked files, not symbolic links.');
    await mkdir(resolve(output, '..'), { recursive: true });
    await copyFile(input, output);
  }
}

async function copyConfig(release, root) {
  for (const file of ['caddy/Caddyfile', 'litellm/config.yaml', 'postgres/init/01-databases.sql']) {
    const target = join(root, 'config', file);
    await mkdir(resolve(target, '..'), { recursive: true });
    await copyFile(join(release, 'infra', file), target);
  }
}

function composeArgs(root, release) {
  return [
    'compose',
    '--project-name',
    'cozy-compute-prod',
    '--env-file',
    join(root, '.env'),
    '-f',
    join(release, 'compose.production.yaml'),
    '-f',
    join(release, 'compose.tunnel.yaml'),
  ];
}

async function backup(root, release, env) {
  const directory = join(root, 'backups');
  await mkdir(directory, { recursive: true });
  const file = join(directory, `cozy-${new Date().toISOString().replace(/[:.]/g, '-')}.sql.gz`);
  const child = spawn(
    'docker',
    [
      ...composeArgs(root, release),
      'exec',
      '-T',
      'postgres',
      'sh',
      '-c',
      'pg_dump --no-owner --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"',
    ],
    { env, windowsHide: true, stdio: ['ignore', 'pipe', 'inherit'] },
  );
  const completed = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => (code === 0 ? resolve() : reject(new Error('Database backup failed.'))));
  });
  await Promise.all([
    completed,
    pipeline(child.stdout, createGzip(), createWriteStream(file, { flags: 'wx', mode: 0o600 })),
  ]);
  console.log(`Database backup saved to ${file}`);
}

async function publicReady(domain, sha) {
  console.log(`Checking https://${domain} through Cloudflare Tunnel...`);
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const version = await fetch(`https://${domain}/version.txt?release=${sha}`, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });
      const api = await fetch(`https://${domain}/api/readyz`, { signal: AbortSignal.timeout(5000) });
      const realtime = await fetch(`https://${domain}/realtime/readyz`, {
        signal: AbortSignal.timeout(5000),
      });
      if (version.ok && (await version.text()).trim() === sha && api.ok && realtime.ok) return;
    } catch {
      /* DNS and Tunnel startup can take a moment. */
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error('Public readiness failed. Check the Tunnel hostname, DNS, and API/WebSocket access.');
}

export async function deploy({
  source = process.cwd(),
  environment = process.env,
  execute = run,
  snapshot = backup,
  probe = publicReady,
} = {}) {
  if (environment.GITHUB_REPOSITORY && environment.GITHUB_SHA && environment.GITHUB_TOKEN) {
    const ref = await fetch(
      `${environment.GITHUB_API_URL || 'https://api.github.com'}/repos/${environment.GITHUB_REPOSITORY}/git/ref/heads/master`,
      {
        headers: {
          authorization: `Bearer ${environment.GITHUB_TOKEN}`,
          accept: 'application/vnd.github+json',
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!ref.ok) throw new Error('Cannot verify the current master commit.');
    if ((await ref.json()).object.sha !== environment.GITHUB_SHA) {
      console.log('A newer commit is already on master; skipping this older deployment.');
      return;
    }
  }
  const configuredRoot = environment.COZY_DEPLOY_DIR;
  if (!configuredRoot || !isAbsolute(configuredRoot))
    throw new Error('Set COZY_DEPLOY_DIR to a separate absolute server directory.');
  const root = resolve(configuredRoot);
  if (within(source, root) || within(root, source))
    throw new Error('The deployment directory must be separate from the Git checkout.');
  const settings = parseEnv(await readFile(join(root, '.env'), 'utf8'));
  for (const key of [
    'GAME_DOMAIN',
    'POSTGRES_PASSWORD',
    'INTERNAL_SECRET',
    'LITELLM_MASTER_KEY',
    'LITELLM_SALT_KEY',
    'ADMIN_EMAILS',
    'CLOUDFLARE_TUNNEL_TOKEN_FILE',
  ]) {
    if (!settings[key]) throw new Error(`Missing ${key} in the server .env.`);
  }
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/i.test(settings.GAME_DOMAIN))
    throw new Error('GAME_DOMAIN must be a hostname without a protocol or port.');
  if (!isAbsolute(settings.CLOUDFLARE_TUNNEL_TOKEN_FILE))
    throw new Error('The Tunnel token file must use an absolute path.');
  await access(settings.CLOUDFLARE_TUNNEL_TOKEN_FILE);
  execute('git', ['diff', '--quiet', 'HEAD'], source);
  const sha = execute('git', ['rev-parse', 'HEAD'], source, undefined, true);
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid Git commit.');
  if (environment.GITHUB_SHA && environment.GITHUB_SHA !== sha)
    throw new Error('Checkout differs from the tested GitHub commit.');

  const lock = join(root, '.deploy-lock');
  await mkdir(lock);
  let previous;
  const stateFile = join(root, 'deployment.json');
  const release = join(root, 'releases', sha);
  const env = {
    ...environment,
    COZY_IMAGE_TAG: sha,
    COZY_CONFIG_DIR: join(root, 'config').replaceAll('\\', '/'),
  };
  const compose = (...args) => execute('docker', [...composeArgs(root, release), ...args], release, env);
  try {
    try {
      previous = JSON.parse(await readFile(stateFile, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await mkdir(release, { recursive: true });
    const files = execute('git', ['ls-files', '-z'], source, undefined, true).split('\0').filter(Boolean);
    await copyTrackedRelease(source, release, files);
    await copyConfig(release, root);
    compose('config', '--quiet');
    compose('build', 'api', 'realtime', 'web');
    compose('up', '-d', '--wait', '--wait-timeout', '300', 'postgres', 'redis', 'litellm');
    await snapshot(root, release, env);
    compose('up', '-d', '--no-build', '--wait', '--wait-timeout', '180');
    compose('exec', '-T', 'caddy', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile');
    await probe(settings.GAME_DOMAIN, sha);
    const temporary = `${stateFile}.next`;
    await writeFile(
      temporary,
      JSON.stringify({ sha, deployedAt: new Date().toISOString() }, null, 2) + '\n',
      { mode: 0o600 },
    );
    await rename(temporary, stateFile);
    console.log(`Deployed ${sha} to https://${settings.GAME_DOMAIN}`);
  } catch (error) {
    if (previous?.sha && /^[a-f0-9]{40}$/.test(previous.sha)) {
      const oldRelease = join(root, 'releases', previous.sha);
      try {
        console.log(`Deployment failed; restoring the previous application images (${previous.sha}).`);
        await copyConfig(oldRelease, root);
        const oldEnv = { ...env, COZY_IMAGE_TAG: previous.sha };
        execute(
          'docker',
          [...composeArgs(root, oldRelease), 'up', '-d', '--no-build', '--wait', '--wait-timeout', '180'],
          oldRelease,
          oldEnv,
        );
        execute(
          'docker',
          [
            ...composeArgs(root, oldRelease),
            'exec',
            '-T',
            'caddy',
            'caddy',
            'reload',
            '--config',
            '/etc/caddy/Caddyfile',
          ],
          oldRelease,
          oldEnv,
        );
        console.log(
          'Restored application images. Database migrations are not automatically reversed; the backup is retained.',
        );
      } catch {
        console.error(
          'Automatic application rollback failed. Review Docker service status and the saved backup.',
        );
      }
    }
    throw error;
  } finally {
    await rmdir(lock);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  deploy().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
