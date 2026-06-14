// Curated trail regions (the coarse "Section" layer — §5): named regions that each
// own a contiguous range of stages, shown as quiet bands on the itinerary (mock
// 846:1752, "Basque Country · STAGES 1–7").
//
// STOPGAP: regions belong in the trail package as curated data (a `region` on each
// stage, or a sections table owning stage ranges — Phase 2). Until the API carries
// them, we derive the band from this curated map by chainage fraction so it scales to
// any stage count. Keyed by trail ref; unknown trails get no bands. Swapping to an
// API-provided region is a one-line change in `buildItineraryDays`.

export interface TrailRegion {
  name: string;
  /** Upper bound (exclusive) as a fraction of the trail length. */
  untilFraction: number;
}

// GR11: Basque Country (1–7) · Navarra (8–11) · Aragon (12–24) · Andorra (25–29) ·
// Catalonia (30–47). Breakpoints as fractions of the 47 official stages.
const GR11_REGIONS: TrailRegion[] = [
  { name: 'Basque Country', untilFraction: 7 / 47 },
  { name: 'Navarra', untilFraction: 11 / 47 },
  { name: 'Aragon', untilFraction: 24 / 47 },
  { name: 'Andorra', untilFraction: 29 / 47 },
  { name: 'Catalonia', untilFraction: 1 },
];

export function regionsForTrail(ref: string | null | undefined): TrailRegion[] | null {
  if (ref && ref.toUpperCase() === 'GR11') return GR11_REGIONS;
  return null;
}

/** The region a point at `fraction` (0..1) of the trail falls in. */
export function regionAt(fraction: number, regions: TrailRegion[]): string {
  for (const r of regions) {
    if (fraction < r.untilFraction) return r.name;
  }
  return regions[regions.length - 1]?.name ?? '';
}
