import type { TrailSection } from './api';

export interface RegionGroup {
  name: string;
  /** 1-based stage numbers spanned (by orderIndex). */
  stageStart: number;
  stageEnd: number;
  stageCount: number;
  distanceM: number;
  ascentM: number;
  image: string | null;
  /** Derived "Start → End" place pair from the stage names. */
  from: string | null;
  to: string | null;
}

// Pull the start/end place out of a stage name like "Espinal → Burguete".
function endpoints(name: string): [string | null, string | null] {
  const parts = name.split('→').map((s) => s.trim());
  if (parts.length === 2) return [parts[0] ?? null, parts[1] ?? null];
  return [name.trim() || null, null];
}

/**
 * Group a trail's stages into its coarse Region layer (§5). There is no regions
 * endpoint yet, so we fold the `regionName` joined onto each stage into ordered
 * groups, deriving each region's stage range, distance, ascent, cover image and
 * its start→end gateway towns — enough to render the "sections" cards from the
 * structural data alone.
 */
export function groupSectionsIntoRegions(sections: TrailSection[]): RegionGroup[] {
  const ordered = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const groups = new Map<string, TrailSection[]>();
  for (const s of ordered) {
    const key = s.regionName ?? 'Along the way';
    const list = groups.get(key);
    if (list) list.push(s);
    else groups.set(key, [s]);
  }

  return [...groups.entries()].map(([name, list]) => {
    const first = list[0] as TrailSection;
    const last = list[list.length - 1] as TrailSection;
    const [from] = endpoints(first.name);
    const [, to] = endpoints(last.name);
    return {
      name,
      stageStart: first.orderIndex,
      stageEnd: last.orderIndex,
      stageCount: list.length,
      distanceM: list.reduce((sum, s) => sum + (s.endChainageM - s.startChainageM), 0),
      ascentM: list.reduce((sum, s) => sum + (s.ascentM ?? 0), 0),
      image: first.imageUrl,
      from,
      to: to ?? endpoints(last.name)[0],
    };
  });
}
