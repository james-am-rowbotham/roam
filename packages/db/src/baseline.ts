// Run once to tell the drizzle migrator that migration 0000 was already applied
// manually (before the migrations table existed). Safe to re-run — uses IF NOT EXISTS.
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const sql = postgres(url, { max: 1 });

await sql`
  CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id        SERIAL PRIMARY KEY,
    hash      TEXT NOT NULL,
    created_at BIGINT
  )
`;

const existing = await sql`
  SELECT id FROM drizzle.__drizzle_migrations WHERE hash = 'f9c949b83c6744dd9a0d19e3a35103c3dd7626b977f7539f73d80e30b6713f8e'
`;

if (existing.length === 0) {
  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('f9c949b83c6744dd9a0d19e3a35103c3dd7626b977f7539f73d80e30b6713f8e', ${Date.now()})
  `;
  console.log('Baseline complete — migration 0000 marked as applied');
} else {
  console.log('Already baselined — nothing to do');
}

await sql.end();
process.exit(0);
