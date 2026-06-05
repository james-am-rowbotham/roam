import { db, sql } from './connection'

// Simplified GR11 polyline — Hendaye → Cap de Creus (~830 km).
// ~35 waypoints along the Spanish-side Pyrenees; enough for map rendering POC.
// The real import pipeline (Phase 1) will replace this with full OSM geometry.
const GR11_WKT = `LINESTRING(
  -1.7777 43.3710,
  -1.7542 43.3523,
  -1.6831 43.2914,
  -1.5872 43.1383,
  -1.5047 43.1514,
  -1.3578 42.9811,
  -1.2139 42.9231,
  -1.0803 42.9103,
  -0.9100 42.8600,
  -0.8022 42.8197,
  -0.7536 42.7397,
  -0.6431 42.7839,
  -0.5311 42.7997,
  -0.3833 42.7792,
  -0.3453 42.7733,
  -0.2747 42.7242,
  -0.1000 42.6800,
  0.0500  42.6600,
  0.2153  42.6306,
  0.2700  42.6800,
  0.5217  42.6036,
  0.6783  42.5758,
  0.7703  42.5536,
  0.9031  42.5694,
  1.0925  42.5783,
  1.2161  42.5428,
  1.3714  42.5381,
  1.5025  42.4900,
  1.6742  42.4719,
  1.8100  42.4400,
  2.0372  42.4006,
  2.1539  42.3914,
  2.2819  42.3736,
  2.7781  42.3297,
  3.0100  42.3100,
  3.1972  42.2700,
  3.3196  42.3194
)`

const existing = await db.execute(sql`SELECT id FROM trails WHERE name = 'GR11'`)
if ((existing as unknown[]).length > 0) {
  console.log('GR11 already seeded — skipping')
  process.exit(0)
}

await db.execute(sql`
  INSERT INTO trails (name, description, geom)
  VALUES (
    'GR11',
    'Sendero de los Pirineos — Hendaye to Cap de Creus (~830 km)',
    ST_GeomFromText(${GR11_WKT}, 4326)
  )
`)

console.log('GR11 seeded successfully')
process.exit(0)
