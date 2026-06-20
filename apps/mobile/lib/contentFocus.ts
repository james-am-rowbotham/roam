import type { ContentBlock } from '@roam/content';
import { useRouter } from 'expo-router';
import { type FocusScope, useMapStore } from '../store/mapStore';
import { contentRepo, contentStore } from './contentRepo';

// Focus an entity on the map from the content browse/search (string-id world). All
// geometry comes from the bundled content pack's map blocks (§7) — offline, no API.
// Tapping a trail/section/stage/segment highlights it and zooms in; the map shows
// removable scope chips (see mapStore ContentFocus).

const mapGeom = (blocks?: ContentBlock[]): GeoJSON.Geometry | null => {
  const b = blocks?.find((x): x is Extract<ContentBlock, { kind: 'map' }> => x.kind === 'map');
  return b?.geojson.features[0]?.geometry ?? null;
};

async function routeGeomOf(objectiveId: string): Promise<GeoJSON.Geometry | null> {
  const o = await contentRepo.getObjective(objectiveId);
  return mapGeom(o.guide?.find((t) => t.key === 'map')?.blocks);
}
async function sectionGeomOf(sectionId: string): Promise<GeoJSON.Geometry | null> {
  const s = await contentRepo.getSection(sectionId);
  return mapGeom(s.guide?.find((t) => t.key === 'map')?.blocks);
}
async function stageGeomOf(stageId: string): Promise<GeoJSON.Geometry | null> {
  const s = await contentRepo.getStage(stageId);
  return mapGeom(s.blocks);
}

/** Stages of an objective in walking order (string-id world) — for ranges + labels. */
function objectiveStages(objectiveId: string) {
  const sectionIds = new Set(
    [...contentStore.sectionSummaries.values()]
      .filter((s) => s.objectiveId === objectiveId)
      .map((s) => s.id),
  );
  return [...contentStore.stageSummaries.values()]
    .filter((s) => sectionIds.has(s.sectionId))
    .sort((a, b) => a.number - b.number);
}

/** Merge a set of stage line geometries into one MultiLineString (for a segment). */
function mergeLines(geoms: GeoJSON.Geometry[]): GeoJSON.Geometry | null {
  const coordinates = geoms.flatMap((g) =>
    g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [],
  );
  return coordinates.length ? { type: 'MultiLineString', coordinates } : null;
}

export function useFocusOnMap() {
  const router = useRouter();
  const setFocus = useMapStore((s) => s.setFocus);

  const trailLabel = (objectiveId: string) =>
    contentStore.objectiveSummaries.get(objectiveId)?.name ?? objectiveId;

  const go = (
    objectiveId: string,
    routeGeom: GeoJSON.Geometry | null,
    scope: FocusScope | null,
  ) => {
    if (!routeGeom) return; // no geometry in the pack → nothing to show
    setFocus({ objectiveId, trailLabel: trailLabel(objectiveId), routeGeom, scope });
    router.push('/(tabs)/map');
  };

  const focusTrail = async (objectiveId: string) => {
    go(objectiveId, await routeGeomOf(objectiveId), null);
  };

  const focusSection = async (objectiveId: string, sectionId: string) => {
    const [route, geom] = await Promise.all([routeGeomOf(objectiveId), sectionGeomOf(sectionId)]);
    const stages = objectiveStages(objectiveId).filter((s) => s.sectionId === sectionId);
    const scope: FocusScope | null = geom
      ? {
          kind: 'section',
          label: contentStore.sectionSummaries.get(sectionId)?.name ?? 'Section',
          geom,
          sectionId,
          fromStageId: stages[0]?.id,
          toStageId: stages[stages.length - 1]?.id,
        }
      : null;
    go(objectiveId, route, scope);
  };

  const focusStage = async (objectiveId: string, stageId: string) => {
    const [route, geom] = await Promise.all([routeGeomOf(objectiveId), stageGeomOf(stageId)]);
    const num = contentStore.stageSummaries.get(stageId)?.number;
    const scope: FocusScope | null = geom
      ? {
          kind: 'stage',
          label: `Stage ${num ?? '?'}`,
          geom,
          stageId,
          fromStageId: stageId,
          toStageId: stageId,
        }
      : null;
    go(objectiveId, route, scope);
  };

  const focusSegment = async (objectiveId: string, fromStageId: string, toStageId: string) => {
    const fromNum = contentStore.stageSummaries.get(fromStageId)?.number ?? 0;
    const toNum = contentStore.stageSummaries.get(toStageId)?.number ?? 0;
    const inRange = objectiveStages(objectiveId).filter(
      (s) => s.number >= fromNum && s.number <= toNum,
    );
    const [route, ...geoms] = await Promise.all([
      routeGeomOf(objectiveId),
      ...inRange.map((s) => stageGeomOf(s.id)),
    ]);
    const merged = mergeLines(geoms.filter((g): g is GeoJSON.Geometry => !!g));
    const scope: FocusScope | null = merged
      ? {
          kind: 'segment',
          label: `Stages ${fromNum}–${toNum}`,
          geom: merged,
          fromStageId,
          toStageId,
        }
      : null;
    go(objectiveId, route, scope);
  };

  return { focusTrail, focusSection, focusStage, focusSegment };
}
