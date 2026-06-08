// Clean aliases over the Orval-generated hooks.
// Import from here in screens, never directly from lib/generated/api.
export {
  useGetTrails as useTrails,
  useGetTrailsId as useTrail,
  useGetTrailsIdSections as useTrailSections,
  useGetTrailsIdWater as useTrailWater,
  useGetTrailsIdAccommodations as useTrailAccommodations,
  useGetSectionsId as useSection,
} from './generated/api';

// Re-export types screens need
export type {
  GetTrails200Item as TrailListItem,
  GetTrailsId200 as TrailFeature,
  GetTrailsIdSections200Item as Section,
  GetTrailsIdWater200Item as WaterSource,
  GetTrailsIdAccommodations200Item as Accommodation,
} from './generated/api';
