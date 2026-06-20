/** Metres → "820 km" (rounded). Mirrors how the app renders trail distance. */
export function formatDistance(distanceM: number | null | undefined): string | null {
  if (distanceM == null) return null;
  return `${Math.round(distanceM / 1000)} km`;
}

/** Kilometres as a plain rounded integer string ("820"). */
export function km(distanceM: number | null | undefined): string {
  if (distanceM == null) return '—';
  return `${Math.round(distanceM / 1000)}`;
}

/** Metres with a thousands separator and unit ("2,782 m"). */
export function meters(m: number | null | undefined): string {
  if (m == null) return '—';
  return `${Math.round(m).toLocaleString('en-US')} m`;
}

/**
 * A rough day-count range for a thru-hike, ~17–20 km/day. Days are a soft
 * forecast, never a contract (§11) — this is just an at-a-glance hint.
 */
export function dayRange(distanceM: number | null | undefined): string {
  if (!distanceM) return '—';
  const dkm = distanceM / 1000;
  const slow = Math.round(dkm / 17);
  const fast = Math.round(dkm / 20);
  return fast === slow ? `${fast}` : `${fast}–${slow}`;
}
