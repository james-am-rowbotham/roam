import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
export { sql } from 'drizzle-orm'

const client = postgres(
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/roam_poc'
)

export const db = drizzle(client)
