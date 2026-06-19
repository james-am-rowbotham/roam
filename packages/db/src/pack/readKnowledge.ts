// readKnowledge — the one I/O piece of the pack pipeline. Reads a trail's ingested
// data from Postgres (route geometry/elevation, the 5 coarse regions, the 46 etapas,
// + the etapa boundary coordinates via PostGIS) into the normalized TrailKnowledge that
// the pure buildTrailPack consumes. Source-specific; everything downstream is pure.

import type { PackConfig, TrailKnowledge } from '@roam/pipeline';
import postgres from 'postgres';

// Stable slug for a coarse region name → the discovery Region id + Section suffix.
const slugify = (s: string): string => {
  const ascii = s
    .toLowerCase()
    .normalize('NFD')
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: NFD combining diacritics, stripped on purpose
    .replace(/[\u0300-\u036f]/g, '');
  return ascii.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const fromTo = (name: string): [string, string] => {
  const parts = name.split('→').map((p) => p.trim());
  return [parts[0] ?? name, parts.at(-1) ?? name];
};

interface RouteRow {
  id: number;
  name: string;
  distance_m: number | null;
  // jsonb — may arrive parsed (array) or as a JSON string depending on the driver.
  elevation_profile: unknown;
}

function asProfile(raw: unknown): { d: number; e: number }[] {
  const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return Array.isArray(v) ? (v as { d: number; e: number }[]) : [];
}
interface RegionRow {
  id: number;
  name: string;
  description: string | null;
  order_index: number;
}
interface SectionRow {
  id: number;
  name: string;
  region_id: number | null;
  order_index: number;
  start_chainage_m: number;
  end_chainage_m: number;
  ascent_m: number | null;
  descent_m: number | null;
}
interface PointRow {
  idx: number;
  lat: number;
  lng: number;
}
interface WaterRow {
  id: number;
  name: string | null;
  chainage_m: number;
  seasonal: boolean;
  lat: number;
  lng: number;
}
interface AccommRow {
  id: number;
  name: string;
  type: string;
  chainage_m: number;
  seasonal: boolean;
  capacity: number | null;
  booking_url: string | null;
  lat: number;
  lng: number;
}

export async function readKnowledge(config: PackConfig): Promise<TrailKnowledge> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const c = postgres(url, { prepare: false }); // transaction pooler needs prepare:false

  try {
    const [route] = await c<RouteRow[]>`
      SELECT r.id, r.name, r.distance_m, r.elevation_profile
      FROM routes r JOIN trails t ON t.route_id = r.id
      WHERE t.ref = ${config.source.ref} LIMIT 1`;
    if (!route) throw new Error(`No route for trail ref "${config.source.ref}" — ingest it first`);

    const regionRows = await c<RegionRow[]>`
      SELECT id, name, description, order_index FROM regions
      WHERE route_id = ${route.id} ORDER BY order_index`;
    const regionSlug = new Map(regionRows.map((r) => [r.id, slugify(r.name)]));

    const secRows = await c<SectionRow[]>`
      SELECT id, name, region_id, order_index, start_chainage_m, end_chainage_m, ascent_m, descent_m
      FROM sections WHERE route_id = ${route.id} ORDER BY order_index`;
    if (secRows.length === 0) throw new Error(`No etapas for "${config.source.ref}"`);

    const lengthM = Number(route.distance_m ?? secRows.at(-1)?.end_chainage_m ?? 0);
    // N+1 contiguous boundaries: each etapa's start, plus the final end.
    const chainages = [
      Number(secRows[0]?.start_chainage_m ?? 0),
      ...secRows.map((s) => Number(s.end_chainage_m)),
    ];
    const fractions = chainages.map((ch) => Math.min(1, Math.max(0, ch / (lengthM || 1))));

    // One spatial query: interpolate every boundary point along the route line.
    const ptRows = await c<PointRow[]>`
      WITH line AS (SELECT ST_LineMerge(geom) AS g FROM routes WHERE id = ${route.id})
      SELECT f.idx::int AS idx,
             ST_Y(ST_LineInterpolatePoint(line.g, f.frac)) AS lat,
             ST_X(ST_LineInterpolatePoint(line.g, f.frac)) AS lng
      FROM line, unnest(${fractions}::float8[]) WITH ORDINALITY AS f(frac, idx)
      ORDER BY idx`;

    const boundaryName = (i: number): string => {
      if (i === 0) return fromTo(secRows[0]?.name ?? '')[0];
      if (i >= secRows.length) return fromTo(secRows.at(-1)?.name ?? '')[1];
      return fromTo(secRows[i]?.name ?? '')[0];
    };

    const locations = ptRows.map((p, i) => ({
      id: `${config.id}-loc-${i}`,
      name: boundaryName(i) || `km ${Math.round((chainages[i] ?? 0) / 1000)}`,
      type: 'town',
      lat: Number(p.lat),
      lng: Number(p.lng),
    }));

    const stages = secRows.map((s, i) => ({
      number: s.order_index,
      name: s.name,
      regionId: (s.region_id != null ? regionSlug.get(s.region_id) : undefined) ?? 'unassigned',
      startChainageM: Number(s.start_chainage_m),
      endChainageM: Number(s.end_chainage_m),
      ascentM: s.ascent_m != null ? Number(s.ascent_m) : null,
      descentM: s.descent_m != null ? Number(s.descent_m) : null,
      fromLocationId: `${config.id}-loc-${i}`,
      toLocationId: `${config.id}-loc-${i + 1}`,
    }));

    const regions = regionRows.map((r) => ({
      id: slugify(r.name),
      name: r.name,
      description: r.description ?? r.name,
      orderIndex: r.order_index,
    }));

    // Linearly-referenced POIs (§7) — water + accommodation, by chainage along the route.
    const waterRows = await c<WaterRow[]>`
      SELECT id, name, chainage_m, seasonal, ST_Y(geom) AS lat, ST_X(geom) AS lng
      FROM water_sources WHERE route_id = ${route.id} ORDER BY chainage_m`;
    const accommRows = await c<AccommRow[]>`
      SELECT id, name, type, chainage_m, seasonal, capacity, booking_url,
             ST_Y(geom) AS lat, ST_X(geom) AS lng
      FROM accommodations WHERE route_id = ${route.id} ORDER BY chainage_m`;

    const water = waterRows.map((w) => ({
      id: `${config.id}-water-${w.id}`,
      name: w.name ?? 'Water source',
      type: 'water',
      chainageM: Number(w.chainage_m),
      lat: Number(w.lat),
      lng: Number(w.lng),
      seasonal: w.seasonal,
    }));
    const accommodation = accommRows.map((a) => ({
      id: `${config.id}-accom-${a.id}`,
      name: a.name,
      type: a.type,
      chainageM: Number(a.chainage_m),
      lat: Number(a.lat),
      lng: Number(a.lng),
      seasonal: a.seasonal,
      capacity: a.capacity,
      bookingUrl: a.booking_url,
    }));

    return {
      routeName: route.name,
      lengthM,
      elevationProfile: asProfile(route.elevation_profile),
      regions,
      stages,
      locations,
      water,
      accommodation,
    };
  } finally {
    await c.end();
  }
}
