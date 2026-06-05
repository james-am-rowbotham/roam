import { db, sql } from './connection'

await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`)

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS trails (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    geom GEOMETRY(Geometry, 4326) NOT NULL
  )
`)

await db.execute(sql`
  CREATE INDEX IF NOT EXISTS trails_geom_idx ON trails USING GIST (geom)
`)

console.log('Database setup complete')
process.exit(0)
