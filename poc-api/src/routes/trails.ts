import { Hono } from 'hono'
import { db, sql } from '../db/connection'

const trails = new Hono()

trails.get('/', async (c) => {
  const result = await db.execute(sql`
    SELECT id, name, description FROM trails ORDER BY id
  `)
  return c.json(result as unknown[])
})

trails.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.json({ error: 'invalid id' }, 400)

  const result = await db.execute(sql`
    SELECT
      id,
      name,
      description,
      ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.00005))::json AS geometry
    FROM trails
    WHERE id = ${id}
  `)

  const rows = result as unknown as Array<{
    id: number
    name: string
    description: string
    geometry: object
  }>
  if (!rows[0]) return c.json({ error: 'not found' }, 404)

  const row = rows[0]

  return c.json({
    type: 'Feature',
    geometry: row.geometry,
    properties: { id: row.id, name: row.name, description: row.description },
  })
})

export default trails
