import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { deploy } from './deploy.mjs';

const sha = 'a'.repeat(40),
  previousSha = 'b'.repeat(40);
const files = [
  'compose.production.yaml',
  'compose.tunnel.yaml',
  'infra/caddy/Caddyfile',
  'infra/litellm/config.yaml',
  'infra/postgres/init/01-databases.sql',
];

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'cozy-deployment-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = join(directory, 'checkout'),
    root = join(directory, 'production');
  await mkdir(source);
  await mkdir(root);
  for (const file of files) {
    const target = join(source, file);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, 'new config\n');
  }
  const token = join(root, 'tunnel-token.txt');
  await writeFile(token, 'test-only-token');
  const secrets = `GAME_DOMAIN=game.example.com\nPOSTGRES_PASSWORD=test-only\nINTERNAL_SECRET=test-only\nLITELLM_MASTER_KEY=test-only\nLITELLM_SALT_KEY=test-only\nADMIN_EMAILS=admin@example.com\nCLOUDFLARE_TUNNEL_TOKEN_FILE=${token.replaceAll('\\', '/')}\n`;
  await writeFile(join(root, '.env'), secrets);
  await writeFile(join(source, '.env'), 'never-copy-this-secret');
  const operations = [];
  const execute = (command, args) => {
    if (command === 'git') {
      if (args[0] === 'rev-parse') return sha;
      if (args[0] === 'ls-files') return files.join('\0');
      return '';
    }
    operations.push({ args });
    return '';
  };
  const snapshot = async () => {
    operations.push({ backup: true });
  };
  return { source, root, secrets, operations, execute, snapshot, environment: { COZY_DEPLOY_DIR: root } };
}

test('backups precede API replacement, and success is recorded only after public readiness', async (t) => {
  const f = await fixture(t);
  await deploy({
    ...f,
    probe: async (domain, commit) => {
      assert.equal(domain, 'game.example.com');
      assert.equal(commit, sha);
      await assert.rejects(access(join(f.root, 'deployment.json')));
      f.operations.push({ ready: true });
    },
  });
  const backupIndex = f.operations.findIndex((o) => o.backup);
  const replacementIndex = f.operations.findIndex((o) => o.args?.includes('--no-build'));
  assert(backupIndex >= 0 && backupIndex < replacementIndex);
  assert.equal(JSON.parse(await readFile(join(f.root, 'deployment.json'), 'utf8')).sha, sha);
  assert.equal(await readFile(join(f.root, '.env'), 'utf8'), f.secrets);
  await assert.rejects(access(join(f.root, 'releases', sha, '.env')));
  await assert.rejects(access(join(f.root, '.deploy-lock')));
  assert(f.operations.every((o) => !o.args?.includes('down') && !o.args?.includes('--volumes')));
});

test('failed public readiness restores previous images and config without changing deployment state', async (t) => {
  const f = await fixture(t);
  const previous = { sha: previousSha, deployedAt: 'previous' };
  await writeFile(join(f.root, 'deployment.json'), JSON.stringify(previous));
  for (const file of files) {
    const target = join(f.root, 'releases', previousSha, file);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, 'old config\n');
  }
  await assert.rejects(
    deploy({
      ...f,
      probe: async () => {
        throw new Error('Tunnel is offline');
      },
    }),
    /Tunnel is offline/,
  );
  assert.deepEqual(JSON.parse(await readFile(join(f.root, 'deployment.json'), 'utf8')), previous);
  assert.equal(await readFile(join(f.root, 'config', 'caddy', 'Caddyfile'), 'utf8'), 'old config\n');
  assert(
    f.operations.some(
      (o) => o.args?.some((arg) => arg.includes(previousSha)) && o.args?.includes('--no-build'),
    ),
  );
  await assert.rejects(access(join(f.root, '.deploy-lock')));
});

test('unsafe deployment roots and mismatched commits stop before calling Docker', async (t) => {
  const f = await fixture(t);
  await assert.rejects(deploy({ ...f, environment: { COZY_DEPLOY_DIR: f.source } }), /separate/);
  await assert.rejects(
    deploy({ ...f, environment: { COZY_DEPLOY_DIR: f.root, GITHUB_SHA: previousSha } }),
    /tested/,
  );
  assert.equal(f.operations.length, 0);
});
