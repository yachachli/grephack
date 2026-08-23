import { config as loadDotenv } from 'dotenv';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

loadDotenv({ path: new URL('../.env', import.meta.url).pathname });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const directory = new URL('../db/migrations', import.meta.url).pathname;

await db.connect();
try {
  await db.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of files) {
    const applied = await db.query('select 1 from schema_migrations where name = $1', [file]);
    if (applied.rowCount) continue;
    await db.query('begin');
    try {
      await db.query(await readFile(path.join(directory, file), 'utf8'));
      await db.query('insert into schema_migrations (name) values ($1)', [file]);
      await db.query('commit');
      console.log(`Applied ${file}`);
    } catch (error) {
      await db.query('rollback');
      throw error;
    }
  }
} finally { await db.end(); }
