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
