import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')
const sql = postgres(url);

const migration = readFileSync(
  join(import.meta.dir, '../drizzle/0000_melted_sunset_bain.sql'),
  'utf8',
);

// drizzle generates --> statement-breakpoint comments as separators
const statements = migration
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Running ${statements.length} statements…`);

for (const statement of statements) {
  const safe = statement.replace(/^CREATE TABLE /m, 'CREATE TABLE IF NOT EXISTS ');
  await sql.unsafe(safe);
}

console.log('Migration complete');
await sql.end();
process.exit(0);
