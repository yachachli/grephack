import pg from 'pg';

export type Db = pg.Pool;

export function createDb(databaseUrl: string): Db {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  pool.on('error', (error) => console.error('Idle Postgres connection error', error));
  return pool;
}
