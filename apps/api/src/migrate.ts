import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ACTIVITY_CONFIG, ITEM_SEEDS } from '@cozy/game-data';
import type { Db } from './db.js';
import { DEFAULT_SETTINGS } from './settings.js';

function migrationsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // src/ in dev, dist/ in production builds: both sit next to ../migrations
  return path.resolve(here, '../migrations');
}

export async function migrate(db: Db, log: (msg: string) => void = () => undefined): Promise<void> {
  await db.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const dir = migrationsDir();
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const done = await db.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
    if (done.rowCount) continue;
    const sql = await readFile(path.join(dir, file), 'utf8');
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      log(`applied migration ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  await seedReferenceData(db);
}

/** Idempotent reference data. Item catalogue is upserted; admin-tuned configs are only inserted when missing. */
export async function seedReferenceData(db: Db): Promise<void> {
  for (const item of ITEM_SEEDS) {
    await db.query(
      `INSERT INTO item_definitions (id, type, slot, name, description, rarity, coin_price, sprite, size_w, size_h, decor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, slot = EXCLUDED.slot, name = EXCLUDED.name,
         description = EXCLUDED.description, rarity = EXCLUDED.rarity, sprite = EXCLUDED.sprite,
         size_w = EXCLUDED.size_w, size_h = EXCLUDED.size_h, decor = EXCLUDED.decor`,
      [
        item.id,
        item.type,
        item.slot ?? null,
        item.name,
        item.description,
        item.rarity,
        item.coinPrice,
        item.sprite,
        item.size?.w ?? 1,
        item.size?.h ?? 1,
        item.decor ?? 0,
      ],
    );
  }
  for (const [slug, config] of Object.entries(DEFAULT_ACTIVITY_CONFIG)) {
    await db.query(
      `INSERT INTO activities (slug, type, config) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
      [slug, slug.startsWith('event_') ? 'event' : 'job', JSON.stringify(config)],
    );
  }
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [
      key,
      JSON.stringify(value),
    ]);
  }
}
