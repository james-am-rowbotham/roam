import {
  boolean,
  doublePrecision,
  geometry,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// One sampled point on a route's elevation profile: distance-from-start (chainage,
// §7) and elevation, both metres. Sampled along the line at ingest (DEM).
export type ElevationPoint = { d: number; e: number };

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

// The spine. Every walkable line — a long trail or a peak ascent — is a route.
// Trails and peaks are lenses on top; all journey/stage logic references routes.
export const routes = pgTable('routes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  distanceM: doublePrecision('distance_m'),
  ascentM: doublePrecision('ascent_m'),
  descentM: doublePrecision('descent_m'),
  // MultiLineString when ways don't fully connect; LineString when they do.
  // Full-resolution geometry for the offline package; API serves simplified versions.
  geom: geometry('geom', { srid: 4326 }),
  // Raw OSM waymark tags (§16/§17.8). `osmcSymbol` is the literal painted-blaze
  // encoding (e.g. "red:white:red_lower:11:black"), parsed into the sign by
  // resolveWaymark() in @roam/core at the API boundary; `network` is the tier
  // (iwn|nwn|rwn|lwn) kept as sort/filter metadata. The route LINE renders ink.
  osmcSymbol: text('osmc_symbol'),
  network: text('network'),
  // Real elevation profile sampled along the line at ingest (§7) — ordered points
  // of { d: chainage_m, e: elevation_m }. Powers the trail/section elevation chart.
  elevationProfile: jsonb('elevation_profile').$type<ElevationPoint[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// A long-distance trail — one route, many sections.
export const trails = pgTable('trails', {
  id: serial('id').primaryKey(),
  routeId: integer('route_id')
    .notNull()
    .references(() => routes.id),
  ref: text('ref'), // official ref e.g. "GR11", "PCT"
  country: text('country'),
  region: text('region'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// A summit objective. Groups one or more ascent routes under one peak.
export const peaks = pgTable('peaks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  elevationM: doublePrecision('elevation_m'),
  imageUrl: text('image_url'),
  geom: geometry('geom', { type: 'point', srid: 4326 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Join table — a peak has several routes (normal route, north face, etc.)
export const peakRoutes = pgTable('peak_routes', {
  id: serial('id').primaryKey(),
  peakId: integer('peak_id')
    .notNull()
    .references(() => peaks.id),
  routeId: integer('route_id')
    .notNull()
    .references(() => routes.id),
});

// The coarse "Section" layer (§5): a named region of a trail (e.g. GR11's "Aragon"),
// owning a contiguous, ordered range of the route's stages. Curated trail data; carries
// region-level content (description, image) and drives the itinerary region bands (§16)
// and the Trail Detail Sections tab. A stage's region is the FK on `sections` below.
export const regions = pgTable('regions', {
  id: serial('id').primaryKey(),
  routeId: integer('route_id')
    .notNull()
    .references(() => routes.id),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  // Order of the region along the route (Basque = 1 … Catalonia = 5 on the GR11).
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// The fine "Stage" layer (§5): the trail's etapas. Start/end are 1-D chainage positions
// — no geometry needed for queries ("what stage am I in?", "how far to the next?").
export const sections = pgTable('sections', {
  id: serial('id').primaryKey(),
  routeId: integer('route_id')
    .notNull()
    .references(() => routes.id),
  // The coarse region this stage belongs to (§5). Null until curated/ingested.
  regionId: integer('region_id').references(() => regions.id),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  orderIndex: integer('order_index').notNull(),
  startChainageM: doublePrecision('start_chainage_m').notNull(),
  endChainageM: doublePrecision('end_chainage_m').notNull(),
  ascentM: doublePrecision('ascent_m'),
  descentM: doublePrecision('descent_m'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Trust layer — spread into every POI table.
// confidence is derived from recency + reporter reliability + agreement.
// manual_override protects curated values from being clobbered by re-import.
// ---------------------------------------------------------------------------
const trustFields = {
  source: text('source', { enum: ['osm', 'model', 'partner', 'community'] })
    .notNull()
    .default('osm'),
  confidence: doublePrecision('confidence').notNull().default(0.5),
  lastConfirmedAt: timestamp('last_confirmed_at'),
  reportCount: integer('report_count').notNull().default(0),
  manualOverride: boolean('manual_override').notNull().default(false),
};

// ---------------------------------------------------------------------------
// POIs — all linearly referenced via chainage_m.
// geom is kept for map rendering; all proximity queries use chainage_m.
// ---------------------------------------------------------------------------

export const waterSources = pgTable('water_sources', {
  id: serial('id').primaryKey(),
  routeId: integer('route_id')
    .notNull()
    .references(() => routes.id),
  name: text('name'),
  chainageM: doublePrecision('chainage_m').notNull(),
  imageUrl: text('image_url'),
  geom: geometry('geom', { type: 'point', srid: 4326 }),
  seasonal: boolean('seasonal').notNull().default(false),
  ...trustFields,
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const accommodations = pgTable('accommodations', {
  id: serial('id').primaryKey(),
  routeId: integer('route_id')
    .notNull()
    .references(() => routes.id),
  name: text('name').notNull(),
  chainageM: doublePrecision('chainage_m').notNull(),
  geom: geometry('geom', { type: 'point', srid: 4326 }),
  type: text('type', {
    enum: ['refuge', 'hut', 'campsite', 'hotel', 'hostel'],
  }).notNull(),
  imageUrl: text('image_url'),
  capacity: integer('capacity'),
  seasonal: boolean('seasonal').notNull().default(false),
  bookingUrl: text('booking_url'),
  ...trustFields,
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const hazards = pgTable('hazards', {
  id: serial('id').primaryKey(),
  routeId: integer('route_id')
    .notNull()
    .references(() => routes.id),
  name: text('name'),
  chainageM: doublePrecision('chainage_m').notNull(),
  geom: geometry('geom', { type: 'point', srid: 4326 }),
  type: text('type', {
    enum: ['snow', 'river', 'exposure', 'rockfall', 'seasonal_closure', 'other'],
  }).notNull(),
  description: text('description'),
  ...trustFields,
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

// Crowd signals — one-tap condition reports ("flowing", "dry", "full").
// A POI's confidence + lastConfirmedAt are recomputed from recent reports.
export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  entityType: text('entity_type', {
    enum: ['water_source', 'accommodation', 'hazard'],
  }).notNull(),
  entityId: integer('entity_id').notNull(),
  userId: text('user_id').notNull(),
  state: text('state').notNull(), // 'flowing' | 'trickle' | 'dry' | 'open' | 'full'
  note: text('note'),
  geom: geometry('geom', { type: 'point', srid: 4326 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// POI evidence photos. No personal journal — photos are attached to a place,
// not a user's story. storageKey is provider-agnostic (currently R2).
export const photos = pgTable('photos', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  poiId: integer('poi_id').notNull(),
  reportId: integer('report_id').references(() => reports.id),
  storageKey: text('storage_key').notNull(),
  width: integer('width'),
  height: integer('height'),
  takenAt: timestamp('taken_at'),
  moderation: text('moderation', { enum: ['pending', 'approved', 'removed'] })
    .notNull()
    .default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Journey planning
// ---------------------------------------------------------------------------

// A user's plan/attempt of a route. start/end chainage allow partial routes
// (e.g. "GR11 from Benasque to the end").
export const journeys = pgTable('journeys', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name'),
  routeId: integer('route_id')
    .notNull()
    .references(() => routes.id),
  direction: text('direction', { enum: ['forward', 'reverse'] })
    .notNull()
    .default('forward'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  status: text('status', { enum: ['planned', 'active', 'paused', 'completed', 'abandoned'] })
    .notNull()
    .default('planned'),
  accommodation: text('accommodation', { enum: ['refuge', 'camping', 'mixed'] }),
  // Pace is a soft hint that groups the trail's stages into days (§11). Adjustable
  // mid-journey from Settings; re-groups only the remaining stages. Never enforced.
  pace: text('pace', { enum: ['relaxed', 'moderate', 'fast'] }),
  // How proactive the Guide is — collected in setup, editable in journey Settings.
  guidePreset: text('guide_preset', { enum: ['silent', 'guided', 'full'] })
    .notNull()
    .default('guided'),
  startChainageM: doublePrecision('start_chainage_m'),
  endChainageM: doublePrecision('end_chainage_m'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// A generated day within a journey. Positions are chainage-based; geometry is
// derived at query time via ST_LineSubstring on the parent route.
export const stages = pgTable('stages', {
  id: serial('id').primaryKey(),
  journeyId: integer('journey_id')
    .notNull()
    .references(() => journeys.id),
  orderIndex: integer('order_index').notNull(),
  startChainageM: doublePrecision('start_chainage_m').notNull(),
  endChainageM: doublePrecision('end_chainage_m').notNull(),
  distanceM: doublePrecision('distance_m'),
  ascentM: doublePrecision('ascent_m'),
  descentM: doublePrecision('descent_m'),
  overnightAccommodationId: integer('overnight_accommodation_id').references(
    () => accommodations.id,
  ),
  status: text('status', { enum: ['planned', 'active', 'completed'] })
    .notNull()
    .default('planned'),
  completedAt: timestamp('completed_at'),
  // Wall-clock time spent walking this stage (set on completion). Drives the
  // itinerary's per-day "time taken" (§16); null until tracked.
  elapsedSeconds: integer('elapsed_seconds'),
  restDay: boolean('rest_day').notNull().default(false),
  stoppedEarlyAtChainageM: doublePrecision('stopped_early_at_chainage_m'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
