import { z } from 'zod';

export const TrustSchema = z.object({
  source: z.enum(['osm', 'model', 'partner', 'community']),
  confidence: z.number(),
  lastConfirmedAt: z.string().nullable(),
  reportCount: z.number(),
  manualOverride: z.boolean(),
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
});

export const TrailFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: z.record(z.string(), z.unknown()).nullable(),
  properties: TrailListItemSchema,
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
  restDay: z.boolean(),
  stoppedEarlyAtChainageM: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const JourneySchema = z.object({
  id: z.number(),
  userId: z.string(),
  routeId: z.number(),
  direction: z.enum(['forward', 'reverse']),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  status: z.enum(['planned', 'active', 'completed', 'abandoned']),
  accommodation: z.enum(['refuge', 'camping', 'mixed']).nullable(),
  startChainageM: z.number().nullable(),
  endChainageM: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const JourneyWithStagesSchema = JourneySchema.extend({
  stages: z.array(StageSchema),
});

// Request body for creating a journey. The server runs the Journey Engine over
// the route to generate stages. Pace is set by `targetDistancePerDayM` or, if
// absent, by `startDate`+`endDate`; with neither, every section is its own day.
export const CreateJourneySchema = z.object({
  routeId: z.number(),
  // Interim until Supabase Auth is wired — the owner is taken from the body.
  userId: z.string(),
  direction: z.enum(['forward', 'reverse']).optional(),
  accommodation: z.enum(['refuge', 'camping', 'mixed']).optional(),
  startSectionId: z.number().optional(),
  endSectionId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  targetDistancePerDayM: z.number().positive().optional(),
});

export const ErrorSchema = z.object({
  error: z.string(),
});

export const IdParamSchema = z.object({
  id: z.string().transform(Number),
});
