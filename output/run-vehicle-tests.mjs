import pg from '../apps/api/node_modules/pg/lib/index.js';
import { spawn } from 'node:child_process';
const url = new URL(process.env.DATABASE_URL);
url.pathname = '/postgres';
const db = new pg.Client({ connectionString: url.href });
await db.connect();
const name = 'cozy_vehicle_test';
if (!(await db.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount)
  await db.query('CREATE DATABASE cozy_vehicle_test');
await db.end();
url.pathname = '/' + name;
const env = { ...process.env, TEST_DATABASE_URL: url.href, REDIS_URL: 'redis://127.0.0.1:56379' };
const child = spawn(process.env.ComSpec, ['/d', '/s', '/c', process.argv[2] ?? 'pnpm test'], {
  env,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('exit', (code) => process.exit(code ?? 1));
