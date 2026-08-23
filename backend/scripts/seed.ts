import { config as loadDotenv } from 'dotenv';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

loadDotenv({ path: new URL('../.env', import.meta.url).pathname });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query(await readFile(new URL('../db/seed.sql', import.meta.url), 'utf8'));
  console.log('Seed data loaded');
} finally { await db.end(); }
