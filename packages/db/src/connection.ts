import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Fail loudly when unset — falling back to '' makes postgres-js look up an empty host
// and throw an opaque `getaddrinfo ENOTFOUND` instead of telling you the env is missing.
// Usually means the command was run outside `packages/db` (where its .env auto-loads).
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Run db commands from packages/db (its .env auto-loads), ' +
      'or export DATABASE_URL in the environment.',
  );
}

const client = postgres(url);

// Opt-in SQL logging: set DB_LOG=true to see every query (and its params) Drizzle
// runs. Off by default so migrations/seeds/the app aren't noisy; flip it on when
// you're trying to work out what the database is actually being asked to do.
const dbLogger =
  process.env.DB_LOG === 'true'
    ? {
        logQuery(query: string, params: unknown[]) {
          console.log(`\x1b[35m[sql]\x1b[0m ${query}`, params.length ? params : '');
        },
      }
    : undefined;

export const db = drizzle(client, { schema, logger: dbLogger });
