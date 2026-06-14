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

export const db = drizzle(client, { schema });
