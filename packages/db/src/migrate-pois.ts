// One-time: copy the legacy water_sources + accommodations rows into the unified `pois` table
// (P2, docs/content-pipeline.md) so the new read path has data without re-hitting Overpass.
// Idempotent — clears osm-sourced pois first. Curated (manual_override) pois are kept.
//
//   bun run --filter @roam/db migrate-pois

import postgres from 'postgres';

const c = postgres(process.env.DATABASE_URL ?? '', { max: 1, prepare: false });

// Wipe only the auto-imported rows so a re-run is clean; curated rows survive.
await c`DELETE FROM pois WHERE manual_override = false`;

// water_sources → pois (category 'water', meta { seasonal }).
const water = await c`
  INSERT INTO pois (route_id, category, name, chainage_m, geom, meta, image_url,
                    source, confidence, last_confirmed_at, report_count, manual_override)
  SELECT route_id, 'water', name, chainage_m, geom,
         jsonb_build_object('seasonal', seasonal), image_url,
         source, confidence, last_confirmed_at, report_count, manual_override
  FROM water_sources
  RETURNING id`;

// accommodations → pois (category = type, meta { seasonal, capacity, bookingUrl }).
const accom = await c`
  INSERT INTO pois (route_id, category, name, chainage_m, geom, meta, image_url,
                    source, confidence, last_confirmed_at, report_count, manual_override)
  SELECT route_id, type, name, chainage_m, geom,
         jsonb_build_object('seasonal', seasonal, 'capacity', capacity, 'bookingUrl', booking_url),
         image_url, source, confidence, last_confirmed_at, report_count, manual_override
  FROM accommodations
  RETURNING id`;

console.log(`Migrated → pois: ${water.length} water + ${accom.length} accommodation rows`);
await c.end();
