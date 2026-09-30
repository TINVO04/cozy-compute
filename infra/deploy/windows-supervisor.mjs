import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { access, mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { atomicJson, environment, ready, run, settings, within } from './windows-common.mjs';

const config = await settings();
const children = new Map();
const timers = new Map();
let stopping = false,
  activating = false,
  initialized = false,
  active;
await mkdir(join(config.root, 'logs'), { recursive: true });
const log = createWriteStream(join(config.root, 'logs', 'supervisor.log'), { flags: 'a' });
const report = (message) => log.write(`${new Date().toISOString()} ${message}\n`);

function launch(name, executable, args, cwd, env) {
  const output = createWriteStream(join(config.root, 'logs', `${name}.log`), { flags: 'a' });
  let failures = 0;
  const start = () => {
    if (stopping) return;
    const child = spawn(executable, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    children.set(name, child);
    child.stdout.pipe(output, { end: false });
    child.stderr.pipe(output, { end: false });
    report(`${name} started pid=${child.pid}`);
    const started = Date.now();
    child.on('error', (error) => report(`${name} could not start: ${error.code}`));
    child.on('close', (code) => {
      if (children.get(name) !== child) {
        output.end();
        return;
      }
      children.delete(name);
      if (stopping) {
        output.end();
        return;
      }
      failures = Date.now() - started > 60_000 ? 0 : failures + 1;
      const delay = Math.min(30_000, 1000 * 2 ** Math.min(failures, 5));
      report(`${name} exited code=${code}; retry in ${delay}ms`);
      timers.set(name, setTimeout(start, delay));
    });
  };
  start();
}

async function stopServices(names) {
  for (const name of names) {
    clearTimeout(timers.get(name));
    timers.delete(name);
    const child = children.get(name);
    children.delete(name);
    if (child) {
      const closed = new Promise((resolve) => child.once('close', resolve));
      child.kill();
      await closed;
    }
  }
}

async function activate(version) {
  if (activating) throw new Error('Another activation is in progress.');
  if (!/^[a-f0-9]{40}(?:-local(?:-[0-9]{13})?)?$/.test(version)) throw new Error('Invalid release version.');
  const release = resolve(config.root, 'releases', version);
  if (!within(join(config.root, 'releases'), release)) throw new Error('Invalid release path.');
  for (const file of [
    'apps/api/dist/index.js',
    'apps/realtime/dist/index.js',
    'apps/web/dist/index.html',
    'infra/caddy/Windows.Caddyfile',
  ])
    await access(join(release, file));
  const env = environment(config, release);
  run(
    config.values.CADDY_EXECUTABLE,
    ['validate', '--config', join(release, 'infra/caddy/Windows.Caddyfile'), '--adapter', 'caddyfile'],
    release,
    env,
    true,
  );
  activating = true;
  try {
    await stopServices(['caddy', 'realtime', 'api']);
    launch('api', process.execPath, [join(release, 'apps/api/dist/index.js')], release, env);
    launch('realtime', process.execPath, [join(release, 'apps/realtime/dist/index.js')], release, env);
    launch(
      'caddy',
      config.values.CADDY_EXECUTABLE,
      ['run', '--config', join(release, 'infra/caddy/Windows.Caddyfile'), '--adapter', 'caddyfile'],
      release,
      env,
    );
    await ready(`http://127.0.0.1:${config.values.PROXY_PORT}`, version);
    active = version;
    await atomicJson(join(config.root, 'runtime.json'), { version });
    report(`Activated ${version}`);
  } finally {
    activating = false;
  }
}

const server = createServer(async (req, res) => {
  const send = (status, value) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(value));
  };
  if (req.headers.authorization !== `Bearer ${config.values.CONTROL_SECRET}`) {
    send(401, { error: 'Unauthorized.' });
    return;
  }
  try {
    if (req.method === 'GET' && req.url === '/status') {
      send(200, {
        version: active,
        initialized,
        activating,
        pids: Object.fromEntries([...children].map(([name, child]) => [name, child.pid])),
      });
    } else if (req.method === 'POST' && req.url === '/activate') {
      if (!initialized) throw new Error('Supervisor is still starting.');
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 1024) throw new Error('Request too large.');
      }
      await activate(JSON.parse(body).version);
      send(200, { version: active });
    } else if (req.method === 'POST' && req.url === '/stop') {
      if (activating) throw new Error('Cannot stop during activation.');
      stopping = true;
      await stopServices(['caddy', 'realtime', 'api', 'redis']);
      send(200, { stopped: true });
      server.close(() => {
        log.end();
        process.exit(0);
      });
    } else {
      send(404, { error: 'Not found.' });
    }
  } catch (error) {
    report(`Control failed: ${error.message}`);
    send(500, { error: error.message });
  }
});
server.on('error', (error) => {
  report(`Control listener: ${error.code}`);
  process.exit(1);
});
// Bind before starting any services so duplicate supervisors cannot affect the live game.
await new Promise((resolve) => server.listen(Number(config.values.CONTROL_PORT), '127.0.0.1', resolve));

try {
  const state = run(
    config.values.PG_CTL_EXECUTABLE,
    ['status', '-D', config.values.POSTGRES_DATA_DIR],
    config.root,
    undefined,
    true,
  );
  report(state.split('\n')[0]);
} catch {
  run(
    config.values.PG_CTL_EXECUTABLE,
    [
      'start',
      '-D',
      config.values.POSTGRES_DATA_DIR,
      '-o',
      `-p ${config.values.POSTGRES_PORT}`,
      '-l',
      join(config.root, 'logs', 'postgres.log'),
      '-w',
    ],
    config.root,
  );
}
await mkdir(join(config.root, 'redis'), { recursive: true });
const redisUrl = new URL(config.values.REDIS_URL);
launch(
  'redis',
  config.values.REDIS_EXECUTABLE,
  [
    '--bind',
    '127.0.0.1',
    '--port',
    redisUrl.port,
    '--protected-mode',
    'yes',
    '--appendonly',
    'yes',
    '--dir',
    join(config.root, 'redis'),
  ],
  config.root,
  process.env,
);
try {
  const state = JSON.parse(await readFile(join(config.root, 'runtime.json'), 'utf8'));
  await activate(state.version);
} catch (error) {
  if (error.code !== 'ENOENT') report(`Startup activation failed: ${error.message}`);
}
report('Supervisor ready.');
initialized = true;
