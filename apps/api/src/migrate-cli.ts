import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { migrate } from './migrate.js';

const config = loadConfig();
const db = createPool(config.DATABASE_URL, 2);
try {
  await migrate(db, (m) => console.log(m));
  console.log('migrations up to date');
} finally {
  await db.end();
}
