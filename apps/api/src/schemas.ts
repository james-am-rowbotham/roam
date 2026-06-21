import { z } from 'zod';

export const TrustSchema = z.object({
  source: z.enum(['osm', 'model', 'partner', 'community']),
  confidence: z.number(),
  lastConfirmedAt: z.string().nullable(),
  reportCount: z.number(),
  manualOverride: z.boolean(),
});

// Parsed osmc:symbol waymark (§16/§17.8). Mirrors the @roam/core types so the
// renderer can rebuild the painted sign. The colour comes from the data, not a
// fixed palette; `network` is the raw OSM tier, kept as-is for sort/filter.
export const OsmcMarkSchema = z.object({
  color: z.string(),
  colorName: z.string(),
  shape: z.string().nullable(),
});

export const OsmcSymbolSchema = z.object({
  wayColor: z.string().nullable(),
  background: OsmcMarkSchema,
  foregrounds: z.array(OsmcMarkSchema),
  text: z.string().nullable(),
  textColor: z.string().nullable(),
});

export const WaymarkSchema = z.object({
  symbol: OsmcSymbolSchema.nullable(),
  ref: z.string().nullable(),
  network: z.string().nullable(),
  review: z.enum(['non-hiking-blue', 'unresolved']).optional(),
});

export const TrailListItemSchema = z.object({
  id: z.number(),
  routeId: z.number(),
  ref: z.string().nullable(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  imageUrl: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  distanceM: z.number().nullable(),
  ascentM: z.number().nullable(),
  descentM: z.number().nullable(),
  // The route's painted waymark, parsed from osmc:symbol. The map line is ink;
  // identity lives in this sign (§17.8).
  waymark: WaymarkSchema,
  // Light downsampled elevation silhouette (~48 pts) for journey-card profiles.
  // The full profile is on the trail detail (elevationProfile).
  elevation: z.array(z.number()),
});

// One sampled point of an elevation profile: distance-from-start + elevation (m).
export const ElevationPointSchema = z.object({ d: z.number(), e: z.number() });

// Trail detail adds the real elevation profile (heavy — not on the list).
export const TrailDetailSchema = TrailListItemSchema.extend({
  elevationProfile: z.array(ElevationPointSchema).nullable(),
});

export const TrailFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: z.record(z.string(), z.unknown()).nullable(),
  properties: TrailDetailSchema,
});

export const SectionSchema = z.object({
  id: z.number(),
  routeId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  orderIndex: z.number(),
  startChainageM: z.number(),
  endChainageM: z.number(),
  ascentM: z.number().nullable(),
  descentM: z.number().nullable(),
  regionId: z.number().nullable(),
  // Joined from the region for convenient rendering (band labels, §16).
  regionName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RegionSchema = z.object({
  id: z.number(),
  routeId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  orderIndex: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// A curated read-layer content block (§21) — the unit the app + web render.
export const ContentBlockSchema = z.object({
  id: z.number(),
  scopeType: z.enum(['route', 'region', 'stage', 'poi']),
  scopeId: z.number(),
  lens: z.string(),
  blockType: z.enum(['narrative', 'fact', 'callout', 'media', 'what_you_see', 'faq']),
  title: z.string().nullable(),
  body: z.string(),
  orderIndex: z.number(),
  seasonFrom: z.number().nullable(),
  seasonTo: z.number().nullable(),
  source: z.string(),
  confidence: z.number(),
});

// A coarse Region (§5) with its stage span + distance, for the trail's region list.
export const RegionSummarySchema = RegionSchema.extend({
  stageStart: z.number(),
  stageEnd: z.number(),
  stageCount: z.number(),
  distanceM: z.number(),
});

// Region detail adds the trail context, a geometry slice + elevation slice for
// the region's chainage span, and its content blocks.
export const RegionDetailSchema = RegionSummarySchema.extend({
  trailId: z.number(),
  geometry: z.record(z.string(), z.unknown()).nullable(),
  elevationProfile: z.array(ElevationPointSchema).nullable(),
  contentBlocks: z.array(ContentBlockSchema),
});

export const HazardSchema = z.object({
  id: z.number(),
  routeId: z.number(),
  name: z.string().nullable(),
  chainageM: z.number(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  type: z.enum(['snow', 'river', 'exposure', 'rockfall', 'seasonal_closure', 'other']),
  description: z.string().nullable(),
  ...TrustSchema.shape,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WaterSourceSchema = z.object({
  id: z.number(),
  routeId: z.number(),
  name: z.string().nullable(),
  chainageM: z.number(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  imageUrl: z.string().nullable(),
  seasonal: z.boolean(),
  ...TrustSchema.shape,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AccommodationSchema = z.object({
  id: z.number(),
  routeId: z.number(),
  name: z.string(),
  chainageM: z.number(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  type: z.enum(['refuge', 'hut', 'campsite', 'hotel', 'hostel']),
  imageUrl: z.string().nullable(),
  capacity: z.number().nullable(),
  seasonal: z.boolean(),
  bookingUrl: z.string().nullable(),
  ...TrustSchema.shape,
  createdAt: z.string(),
  updatedAt: z.string(),
});

// --- Journeys & stages -----------------------------------------------------

export const StageSchema = z.object({
  id: z.number(),
  journeyId: z.number(),
  orderIndex: z.number(),
  startChainageM: z.number(),
  endChainageM: z.number(),
  distanceM: z.number().nullable(),
  ascentM: z.number().nullable(),
  descentM: z.number().nullable(),
  overnightAccommodationId: z.number().nullable(),
  status: z.enum(['planned', 'active', 'completed']),
  completedAt: z.string().nullable(),
  elapsedSeconds: z.number().nullable(),
  restDay: z.boolean(),
  stoppedEarlyAtChainageM: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const JourneySchema = z.object({
  id: z.number(),
  userId: z.string(),
  name: z.string().nullable(),
  routeId: z.number(),
  direction: z.enum(['forward', 'reverse']),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  status: z.enum(['planned', 'active', 'paused', 'completed', 'abandoned']),
  accommodation: z.enum(['refuge', 'camping', 'mixed']).nullable(),
  pace: z.enum(['relaxed', 'moderate', 'fast']).nullable(),
  guidePreset: z.enum(['silent', 'guided', 'full']),
  startChainageM: z.number().nullable(),
  endChainageM: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const JourneyWithStagesSchema = JourneySchema.extend({
  stages: z.array(StageSchema),
});

// Journey list rows carry a progress summary (computed from stages) so the My
// Journeys cards can show day counts + distance without fetching every itinerary.
export const JourneySummarySchema = JourneySchema.extend({
  totalDays: z.number(),
  completedDays: z.number(),
  totalDistanceM: z.number(),
  doneDistanceM: z.number(),
});

// Request body for creating a journey. The server runs the Journey Engine over
// the route to generate stages. Pace is set by `targetDistancePerDayM` or, if
// absent, by `startDate`+`endDate`; with neither, every section is its own day.
export const CreateJourneySchema = z.object({
  routeId: z.number(),
  // Interim until Supabase Auth is wired — the owner is taken from the body.
  userId: z.string(),
  name: z.string().optional(),
  direction: z.enum(['forward', 'reverse']).optional(),
  accommodation: z.enum(['refuge', 'camping', 'mixed']).optional(),
  guidePreset: z.enum(['silent', 'guided', 'full']).optional(),
  startSectionId: z.number().optional(),
  endSectionId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  targetDistancePerDayM: z.number().positive().optional(),
  // Optional client-adjusted itinerary (rest days inserted, days combined). When
  // present it is persisted as-is instead of generating stages from pace.
  stages: z
    .array(
      z.object({
        startChainageM: z.number(),
        endChainageM: z.number(),
        distanceM: z.number(),
        ascentM: z.number(),
        descentM: z.number(),
        overnightAccommodationId: z.number().nullable(),
        restDay: z.boolean(),
      }),
    )
    .optional(),
});

// Editable journey settings (Settings tab). Re-planning fields (direction, range,
// pace) are not updatable here — they'd regenerate the itinerary.
export const UpdateJourneySchema = z.object({
  name: z.string().optional(),
  guidePreset: z.enum(['silent', 'guided', 'full']).optional(),
  pace: z.enum(['relaxed', 'moderate', 'fast']).optional(),
});

// Progress / override actions on an active journey. `at` timestamps are stamped
// server-side, so the client only sends the action + target.
export const ProgressActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('pause') }),
  z.object({ type: z.literal('resume') }),
  z.object({ type: z.literal('completeStage'), stageId: z.number() }),
  z.object({ type: z.literal('uncompleteStage'), stageId: z.number() }),
  z.object({ type: z.literal('stopEarly'), stageId: z.number(), chainageM: z.number() }),
  z.object({ type: z.literal('end') }),
]);

export const ErrorSchema = z.object({
  error: z.string(),
});

export const IdParamSchema = z.object({
  id: z.string().transform(Number),
});
