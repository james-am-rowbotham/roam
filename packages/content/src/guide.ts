// Objective Guide helpers (Implementation Pass §6.3) — the trail-vs-peak shell is ONE
// component parameterised by data. These derive the two tab rows from the objective so
// the shell never branches on `type` itself: the underline tabs (Guide | Route(s)) and
// the in-place facet pills (Overview | Planning | Environment|Conditions).

import type { GuideFacet, GuideTopic, Objective } from './types';

export interface TabSpec {
  value: 'guide' | 'route';
  label: string;
}

/** Underline tabs (§6.2 — navigate): Guide + the decomposition tab, labelled by type.
 *  A trail's second tab is "Route" (its Sections); a peak's is "Routes" (its Routes).
 *  ("Route" vs "Sections" wording is §13-open; we keep Figma's "Route" for trails.) */
export function objectiveTabs(objective: Objective): TabSpec[] {
  return [
    { value: 'guide', label: 'Guide' },
    { value: 'route', label: objective.type === 'peak' ? 'Routes' : 'Route' },
  ];
}

const FACET_ORDER: GuideFacet[] = ['overview', 'planning', 'environment', 'conditions'];

/** The facet pills present on this objective, in canonical order — derived from the
 *  guide topics (a trail carries `environment`, a peak `conditions`). Distinct only. */
export function guideFacets(guide: GuideTopic[]): GuideFacet[] {
  const present = new Set(guide.map((t) => t.facet));
  return FACET_ORDER.filter((f) => present.has(f));
}

/** Topics for one facet, in authored order. */
export function topicsForFacet(guide: GuideTopic[], facet: GuideFacet): GuideTopic[] {
  return guide.filter((t) => t.facet === facet);
}

export function facetLabel(facet: GuideFacet): string {
  return facet.charAt(0).toUpperCase() + facet.slice(1);
}
