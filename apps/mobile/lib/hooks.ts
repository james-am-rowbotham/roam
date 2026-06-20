// Clean aliases over the Orval-generated hooks.
// Import from here in screens, never directly from lib/generated/api.
export {
  useGetTrails as useTrails,
  useGetTrailsId as useTrail,
  useGetTrailsIdSections as useTrailSections,
  useGetTrailsIdWater as useTrailWater,
  useGetTrailsIdAccommodations as useTrailAccommodations,
  useGetSectionsId as useSection,
  useGetPoisWaterId as useWaterSource,
  useGetPoisAccommodationsId as useAccommodation,
  useGetJourneys as useJourneys,
  useGetJourneysId as useJourney,
} from './generated/api';

// Orval generated the POST as a query hook (it would fire on mount), so for the
// create action we expose the imperative call and wrap it in useMutation at the
// call site. TODO: configure Orval to emit a mutation hook for POST.
export {
  postJourneys as createJourney,
  postJourneysIdProgress as journeyProgress,
  postJourneysIdRestDay as journeyRestDay,
  postJourneysIdRemoveRestDay as journeyRemoveRestDay,
  postJourneysIdCombine as journeyCombine,
  postJourneysIdSplit as journeySplit,
  deleteJourneysId as deleteJourney,
  patchJourneysId as updateJourney,
  getGetJourneysQueryKey as journeysQueryKey,
  getGetJourneysIdQueryKey as journeyQueryKey,
  getTrailsIdSections as fetchTrailSections,
  getGetTrailsIdSectionsQueryKey as trailSectionsQueryKey,
} from './generated/api';
export type { PostJourneysIdProgressBody as ProgressAction } from './generated/api';

// Re-export types screens need
export type {
  GetTrails200Item as TrailListItem,
  GetTrailsId200 as TrailFeature,
  GetTrailsIdSections200Item as Section,
  GetTrailsIdWater200Item as WaterSource,
  GetTrailsIdAccommodations200Item as Accommodation,
  GetJourneys200Item as JourneyListItem,
  GetJourneysId200 as JourneyWithStages,
  GetJourneysId200StagesItem as Stage,
  PostJourneysBody as CreateJourneyBody,
} from './generated/api';
