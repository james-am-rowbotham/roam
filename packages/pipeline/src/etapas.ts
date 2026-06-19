// Etapa → chainage — place curated day-stages onto the route's 1-D axis (§7).
//
// The official etapas carry published distances, not coordinates. Rather than
// geocode 46 place-name endpoints (fuzzy), we lay them end-to-end by cumulative
// distance and scale to the measured route length, so the Stage boundaries are
// source-grounded and the spine stays continuous (no gaps/overlaps). Pure and
// deterministic; the seed feeds it the route length from PostGIS.

import { GR10_ETAPAS } from './data/gr10-etapas';
import { GR11_ETAPAS, type Gr11Etapa } from './data/gr11-etapas';

export { GR11_ETAPAS, GR10_ETAPAS, type Gr11Etapa };

export interface ChainagedEtapa {
  /** Official etapa number, 1-based, in walking order. */
  stage: number;
  /** From → To endpoints, as published. */
  name: string;
  /** Position along the route, metres from the start (§7). */
  startChainageM: number;
  endChainageM: number;
  /** Scaled segment length, metres. */
  distanceM: number;
  /** Published ascent / descent, metres (null where the source omits them). */
  ascentM: number | null;
  descentM: number | null;
}

/**
 * Lay the etapas onto `[0, routeLengthM]` by cumulative published distance,
 * scaled so the final etapa ends exactly at `routeLengthM`. The published total
 * (~824 km) and the measured line (~820 km) differ slightly; scaling absorbs that
 * and keeps boundaries proportional. The last endpoint is snapped to `routeLengthM`
 * to kill floating-point drift. Input order is the walking order and is preserved.
 */
export function assignEtapaChainage(
  etapas: readonly Gr11Etapa[],
  routeLengthM: number,
): ChainagedEtapa[] {
  const totalKm = etapas.reduce((sum, e) => sum + e.distanceKm, 0);
  const scale = totalKm > 0 ? routeLengthM / (totalKm * 1000) : 1;

  let cursor = 0;
  const out = etapas.map((e, i) => {
    const startChainageM = cursor;
    // Snap the final boundary to the exact route length; accumulate the rest.
    const endChainageM =
      i === etapas.length - 1 ? routeLengthM : startChainageM + e.distanceKm * 1000 * scale;
    cursor = endChainageM;
    return {
      stage: e.stage,
      name: e.name,
      startChainageM,
      endChainageM,
      distanceM: endChainageM - startChainageM,
      ascentM: e.ascentM,
      descentM: e.descentM,
    };
  });
  return out;
}
