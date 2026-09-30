import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { environment, pnpm, settings, within } from './windows-common.mjs';

async function fixture(t, overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), 'cozy-native-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const executable = join(root, 'fake-executable');
  await writeFile(executable, 'test only');
  const data = join(root, 'postgres');
  await mkdir(data);
  const values = {
    GAME_DOMAIN: 'play.example.com',
    DATABASE_URL: 'postgres://production:password@127.0.0.1:55432/cozy_prod',
    REDIS_URL: 'redis://127.0.0.1:56380/0',
    LITELLM_URL: 'http://127.0.0.1:4000',
    ADMIN_EMAILS: 'admin@example.com',
    LITELLM_MASTER_KEY: 'test-only',
    INTERNAL_SECRET: 'a'.repeat(64),
    CONTROL_SECRET: 'b'.repeat(64),
    PROXY_PORT: '8082',
    CONTROL_PORT: '8083',
    API_PORT: '8788',
    REALTIME_PORT: '2568',
    POSTGRES_PORT: '55432',
    CADDY_EXECUTABLE: executable,
    PG_DUMP_EXECUTABLE: executable,
    PG_CTL_EXECUTABLE: executable,
    POSTGRES_DATA_DIR: data,
    REDIS_EXECUTABLE: executable,
    ...overrides,
  };
  await writeFile(
    join(root, '.env'),
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n'),
  );
  return root;
}

test('native configuration rejects remote services, weak secrets and colliding ports', async (t) => {
  for (const [overrides, message] of [
    [{ DATABASE_URL: 'postgres://user:password@remote.example/cozy' }, /local Windows/],
    [{ INTERNAL_SECRET: 'change-me' }, /random bytes/],
    [{ CONTROL_SECRET: 'a'.repeat(64) }, /distinct/],
    [{ CONTROL_PORT: '8082' }, /distinct/],
    [{ LITELLM_URL: 'redis://127.0.0.1:4000' }, /Invalid LITELLM_URL/],
    [{ REDIS_URL: 'redis://127.0.0.1:56380/5' }, /dedicated/],
  ])
    await assert.rejects(settings(await fixture(t, overrides)), message);
});

test('native game binds locally and advertises one HTTPS domain for API and gateway', async (t) => {
  const config = await settings(await fixture(t));
  const env = environment(config, join(config.root, 'releases', 'a'.repeat(40)));
  assert.equal(env.NODE_ENV, 'production');
  assert.equal(env.API_HOST, '127.0.0.1');
  assert.equal(env.REALTIME_HOST, '127.0.0.1');
  assert.equal(env.API_INTERNAL_URL, 'http://127.0.0.1:8788');
  assert.equal(env.PUBLIC_WEB_ORIGIN, 'https://play.example.com');
  assert.equal(env.PUBLIC_GATEWAY_URL, 'https://play.example.com/v1');
  const ciConfig = { ...config, values: { ...config.values, GITHUB_TOKEN: 'private-ci-token' } };
  assert.equal(environment(ciConfig, config.root).GITHUB_TOKEN, undefined);
});

test('release containment and pnpm shell arguments reject path escape and interpolation', () => {
  const root = join(tmpdir(), 'cozy-contained');
  assert(within(root, join(root, 'releases', 'version')));
  assert(!within(root, join(root, '..', 'unrelated')));
  assert.throws(() => pnpm(['build;whoami'], root), /Invalid pnpm argument/);
  assert.throws(() => pnpm(['$(whoami)'], root), /Invalid pnpm argument/);
});
