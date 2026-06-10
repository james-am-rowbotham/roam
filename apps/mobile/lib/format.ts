// Shared display formatters. Keep all distance/elevation/date formatting here so
// screens read consistently and we don't scatter `m / 1000` maths across the app.

/** Metres → "12 km" (rounded) or "12.3 km" when `digits` is given. Null → "—". */
export function formatKm(m: number | null | undefined, digits = 0): string {
  if (m == null) return '—';
  const km = Math.abs(m) / 1000;
  return `${digits > 0 ? km.toFixed(digits) : Math.round(km)} km`;
}

/** Metres of ascent/descent → "1234 m". Null → "—". */
export function formatElevationM(m: number | null | undefined): string {
  if (m == null) return '—';
  return `${Math.round(m)} m`;
}

/**
 * A rough day grade from ascent per km — no curated grade data yet, so this is a
 * heuristic (Easy < 40 m/km, Moderate < 70, else Hard).
 */
export function gradeFor(distanceM: number | null, ascentM: number | null): string {
  const km = (distanceM ?? 0) / 1000;
  if (km <= 0) return 'Easy';
  const perKm = (ascentM ?? 0) / km;
  if (perKm < 40) return 'Easy';
  if (perKm < 70) return 'Moderate';
  return 'Hard';
}

/** ISO date → "4 Jun". Null/invalid → null. */
function formatDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** A pair of ISO dates → "4 Jun – 8 Jun", or a single end if only one is set. */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const s = formatDay(start);
  const e = formatDay(end);
  if (s && e) return `${s} – ${e}`;
  return s ?? e ?? null;
}

// Sections are named "<from> → <to>" along the trail (forward). These split and
// re-orient that label so lists read correctly when walking in reverse.

/** The two endpoint places of a "<from> → <to>" section name. */
export function routeEndpoints(name: string): [string, string] {
  const i = name.indexOf(' → ');
  if (i === -1) return [name, name];
  return [name.slice(0, i), name.slice(i + 3)];
}

/** A section name oriented for the walking direction (flips it when reversed). */
export function orientRoute(name: string, reverse: boolean): string {
  if (!reverse) return name;
  const [from, to] = routeEndpoints(name);
  return `${to} → ${from}`;
}

/**
 * Collapse a day's ordered "A → B" section names into one connected waypoint
 * chain, dropping the shared endpoints: ["A → B", "B → C"] → ["A", "B", "C"].
 */
export function routeChainPlaces(orientedNames: string[]): string[] {
  const places: string[] = [];
  orientedNames.forEach((name, i) => {
    const [from, to] = routeEndpoints(name);
    if (i === 0) places.push(from);
    places.push(to);
  });
  return places;
}
