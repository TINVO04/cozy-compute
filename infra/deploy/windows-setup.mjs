import { randomBytes, createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import { backup } from './windows-deploy.mjs';
import { run, within } from './windows-common.mjs';

try {
  if (process.platform !== 'win32') throw new Error('Run setup on Windows.');
  const source = process.cwd(),
    root = resolve(process.env.COZY_DEPLOY_DIR ?? 'D:/CozyGameProduction');
  if (within(source, root) || within(root, source))
    throw new Error('Production directory must be outside Git.');
  try {
    await access(join(root, '.env'));
    throw new Error('Production .env already exists; setup will not overwrite it.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const development = parseEnv(await readFile(join(source, '.env'), 'utf8'));
  const adminEmails = development.ADMIN_EMAILS.split(',')
    .filter((email) => email && !email.endsWith('.local'))
    .join(',');
  if (!adminEmails) throw new Error('Set a real ADMIN_EMAILS in your local .env first.');
  const pgBin = 'C:/Program Files/PostgreSQL/17/bin';
  const redisExecutable = process.env.COZY_REDIS_EXECUTABLE;
  if (!redisExecutable) throw new Error('Set COZY_REDIS_EXECUTABLE to your existing redis-server.exe path.');
  await access(redisExecutable);
  await mkdir(root, { recursive: true });
  const account = run('whoami.exe', [], source, undefined, true);
  run(
    'icacls.exe',
    [
      root,
      '/inheritance:r',
      '/grant:r',
      `${account}:(OI)(CI)F`,
      '*S-1-5-18:(OI)(CI)F',
      '*S-1-5-32-544:(OI)(CI)F',
    ],
    source,
  );
  await mkdir(join(root, 'bin'), { recursive: true });
  const archive = join(root, 'bin/caddy.zip');
  const download = await fetch(
    'https://github.com/caddyserver/caddy/releases/download/v2.11.4/caddy_2.11.4_windows_amd64.zip',
  );
  if (!download.ok) throw new Error('Caddy download failed.');
  const bytes = Buffer.from(await download.arrayBuffer());
  if (
    createHash('sha256').update(bytes).digest('hex') !==
    '1708333f79e274c7697285afe6d592ab39314e0b131e9ec6bea08ad27df62ebf'
  )
    throw new Error('Caddy checksum mismatch.');
  await writeFile(archive, bytes);
  // Fixed relative paths, no user input is interpolated into PowerShell.
  run(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Expand-Archive -LiteralPath bin/caddy.zip -DestinationPath bin/caddy-unpacked -Force',
    ],
    root,
  );
  await copyFile(join(root, 'bin/caddy-unpacked/caddy.exe'), join(root, 'bin/caddy.exe'));
  const password = randomBytes(32).toString('hex');
  const original = new URL(development.DATABASE_URL);
  const production = new URL(development.DATABASE_URL);
  production.username = 'cozy_game_prod';
  production.password = password;
  production.pathname = '/cozy_game_prod';
  const values = {
    GAME_DOMAIN: 'play.devtizo.vip',
    PROXY_PORT: '8082',
    CONTROL_PORT: '8083',
    API_PORT: '8788',
    REALTIME_PORT: '2568',
    CADDY_EXECUTABLE: join(root, 'bin/caddy.exe').replaceAll(String.fromCharCode(92), '/'),
    PG_DUMP_EXECUTABLE: `${pgBin}/pg_dump.exe`,
    PG_CTL_EXECUTABLE: `${pgBin}/pg_ctl.exe`,
    POSTGRES_DATA_DIR: join(source, 'infra/postgres/local_data').replaceAll(String.fromCharCode(92), '/'),
    POSTGRES_PORT: original.port,
    DATABASE_URL: production.href,
    REDIS_URL: 'redis://127.0.0.1:56380/0',
    REDIS_EXECUTABLE: redisExecutable.replaceAll(String.fromCharCode(92), '/'),
    INTERNAL_SECRET: randomBytes(32).toString('hex'),
    CONTROL_SECRET: randomBytes(32).toString('hex'),
    ADMIN_EMAILS: adminEmails,
    LITELLM_URL: development.LITELLM_URL || 'http://127.0.0.1:4000',
    LITELLM_MASTER_KEY: development.LITELLM_MASTER_KEY,
  };
  const snapshot = await backup({ root, values: { ...values, DATABASE_URL: development.DATABASE_URL } });
  const { Client } = createRequire(join(source, 'apps/api/package.json'))('pg');
  const db = new Client({ connectionString: development.DATABASE_URL });
  await db.connect();
  try {
    const existing = await db.query(
      "SELECT datname FROM pg_database WHERE datname = 'cozy_game_prod' UNION ALL SELECT rolname FROM pg_roles WHERE rolname = 'cozy_game_prod'",
    );
    if (existing.rowCount)
      throw new Error('Production database or role already exists; refusing to replace it.');
    await db.query(`CREATE ROLE cozy_game_prod LOGIN PASSWORD '${password}'`);
    await db.query('CREATE DATABASE cozy_game_prod OWNER cozy_game_prod');
  } finally {
    await db.end();
  }
  const restore = spawn(
    `${pgBin}/psql.exe`,
    [
      '--host',
      original.hostname,
      '--port',
      original.port,
      '--username',
      'cozy_game_prod',
      '--dbname',
      'cozy_game_prod',
      '--set',
      'ON_ERROR_STOP=1',
    ],
    {
      windowsHide: true,
      env: { ...process.env, PGPASSWORD: password },
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  restore.stdout.resume();
  restore.stderr.resume();
  const restored = new Promise((resolve, reject) => {
    restore.once('error', reject);
    restore.once('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error('Database restore failed. Original database and backup are intact.')),
    );
  });
  await pipeline(createReadStream(snapshot), createGunzip(), restore.stdin);
  await restored;
  await writeFile(
    join(root, '.env'),
    Object.entries(values)
      .map(([key, value]) => `${key}="${value}"`)
      .join('\n') + '\n',
    { flag: 'wx', mode: 0o600 },
  );
  console.log(`Production configured at ${root}. Database copied with backup; development remains running.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
