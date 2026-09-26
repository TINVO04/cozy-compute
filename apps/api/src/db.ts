import pg from 'pg';

// bigint columns (coin balances) are returned as JS numbers; values stay far below 2^53.
pg.types.setTypeParser(20, (v) => Number.parseInt(v, 10));
// numeric columns (money) as numbers
pg.types.setTypeParser(1700, (v) => Number.parseFloat(v));

export type Db = pg.Pool;
export type Tx = pg.PoolClient;
export type Queryable = pg.Pool | pg.PoolClient;

export function createPool(connectionString: string, max = 10): Db {
  return new pg.Pool({ connectionString, max });
}

export async function withTx<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function one<T extends pg.QueryResultRow>(
  q: Queryable,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const r = await q.query<T>(sql, params);
  return r.rows[0] ?? null;
}

export async function many<T extends pg.QueryResultRow>(
  q: Queryable,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const r = await q.query<T>(sql, params);
  return r.rows;
}
