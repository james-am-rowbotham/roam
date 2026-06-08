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

export const ErrorSchema = z.object({
  error: z.string(),
});

export const IdParamSchema = z.object({
  id: z.string().transform(Number),
});
