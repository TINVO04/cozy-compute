import { spawn, spawnSync } from 'node:child_process';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { parseEnv } from 'node:util';

export function within(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

export async function settings(root = process.env.COZY_DEPLOY_DIR ?? process.cwd()) {
  if (!root || !isAbsolute(root))
    throw new Error('Set COZY_DEPLOY_DIR to an absolute directory outside Git.');
  root = resolve(root);
  const values = parseEnv(await readFile(join(root, '.env'), 'utf8'));
  for (const key of ['GAME_DOMAIN', 'DATABASE_URL', 'REDIS_URL', 'ADMIN_EMAILS', 'LITELLM_MASTER_KEY']) {
    if (!values[key]) throw new Error(`Missing ${key} in production .env.`);
  }
  for (const key of ['INTERNAL_SECRET', 'CONTROL_SECRET']) {
    if (!/^[a-f0-9]{64,}$/i.test(values[key]))
      throw new Error(`${key} requires at least 32 random bytes in hex.`);
  }
  if (values.INTERNAL_SECRET === values.CONTROL_SECRET)
    throw new Error('Production secrets must be distinct.');
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/i.test(values.GAME_DOMAIN)) throw new Error('Invalid GAME_DOMAIN.');
  for (const key of ['DATABASE_URL', 'REDIS_URL', 'LITELLM_URL']) {
    const url = new URL(values[key]);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
      throw new Error(`${key} must use a local Windows service.`);
    const protocols = {
      DATABASE_URL: ['postgres:', 'postgresql:'],
      REDIS_URL: ['redis:'],
      LITELLM_URL: ['http:'],
    };
    if (!protocols[key].includes(url.protocol)) throw new Error(`Invalid ${key}.`);
  }
  const redis = new URL(values.REDIS_URL);
  if (redis.username || redis.password || !redis.port || !['', '/', '/0'].includes(redis.pathname))
    throw new Error('Use a dedicated local Redis instance with database 0.');
  if (!/^[0-9]+$/.test(values.POSTGRES_PORT) || Number(values.POSTGRES_PORT) > 65535)
    throw new Error('Invalid POSTGRES_PORT.');
  const ports = ['PROXY_PORT', 'CONTROL_PORT', 'API_PORT', 'REALTIME_PORT'].map((key) => {
    const port = Number(values[key]);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`Invalid ${key}.`);
    return port;
  });
  if (new Set(ports).size !== ports.length) throw new Error('Production ports must be distinct.');
  for (const key of [
    'CADDY_EXECUTABLE',
    'PG_DUMP_EXECUTABLE',
    'PG_CTL_EXECUTABLE',
    'POSTGRES_DATA_DIR',
    'REDIS_EXECUTABLE',
  ]) {
    if (!values[key] || !isAbsolute(values[key])) throw new Error(`${key} must be an absolute path.`);
    await access(values[key]);
  }
  return { root, values };
}

export function environment(config, release) {
  const env = {
    ...process.env,
    ...config.values,
    NODE_ENV: 'production',
    API_HOST: '127.0.0.1',
    REALTIME_HOST: '127.0.0.1',
    API_INTERNAL_URL: `http://127.0.0.1:${config.values.API_PORT}`,
    PUBLIC_WEB_ORIGIN: `https://${config.values.GAME_DOMAIN}`,
    EXTRA_CORS_ORIGINS: `http://127.0.0.1:${config.values.PROXY_PORT}`,
    PUBLIC_GATEWAY_URL: `https://${config.values.GAME_DOMAIN}/v1`,
    WEB_ROOT: join(release, 'apps', 'web', 'dist').replaceAll(String.fromCharCode(92), '/'),
  };
  // CI credentials must not persist in long-running game services.
  for (const key of Object.keys(env)) {
    if (/^(GITHUB_|GH_|ACTIONS_|RUNNER_)/.test(key)) delete env[key];
  }
  return env;
}

export function run(command, args, cwd, env = process.env, capture = false) {
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

export function pnpm(args, cwd, env) {
  // PowerShell resolves pnpm.cmd without shell interpolation of paths or arguments.
  if (args.some((arg) => !/^[a-z0-9@/:=._-]+$/i.test(arg))) throw new Error('Invalid pnpm argument.');
  return run(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `& pnpm.cmd ${args.map((arg) => `'${arg}'`).join(' ')}; exit $LASTEXITCODE`,
    ],
    cwd,
    env,
  );
}

export async function atomicJson(file, value) {
  await writeFile(`${file}.next`, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await rename(`${file}.next`, file);
}

export async function control(config, path, body) {
  const response = await fetch(`http://127.0.0.1:${config.values.CONTROL_PORT}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { authorization: `Bearer ${config.values.CONTROL_SECRET}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Production supervisor failed.');
  return result;
}

export async function ready(origin, version, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const responses = await Promise.all(
        ['/version.txt', '/api/readyz', '/realtime/readyz'].map((path) =>
          fetch(`${origin}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) }),
        ),
      );
      if (responses.every((response) => response.ok) && (await responses[0].text()).trim() === version)
        return;
    } catch {
      /* Startup, DNS and tunnel propagation can take a moment. */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Readiness failed at ${origin}.`);
}

export async function startSupervisor(config) {
  let running = false;
  try {
    const status = await control(config, '/status');
    if (status.initialized !== false) return status;
    running = true;
  } catch {
    /* Start if not running. */
  }
  await mkdir(join(config.root, 'logs'), { recursive: true });
  if (!running) {
    const child = spawn(process.execPath, [join(config.root, 'manager', 'windows-supervisor.mjs')], {
      cwd: config.root,
      env: { ...environment(config, config.root), COZY_DEPLOY_DIR: config.root },
      windowsHide: true,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  }
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const status = await control(config, '/status');
      if (status.initialized) return status;
    } catch {
      /* Await control listener. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Supervisor did not start. Check production logs and port availability.');
}
