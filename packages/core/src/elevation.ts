// Elevation selectors (pure) — shared by the API (light list payloads) and the
// ElevationProfile component. The stored DEM profile (§7) can be hundreds of
// points; these reduce it to a renderable silhouette.

// Downsample a series to ~n points by averaging buckets — smooths a long profile
// into a small silhouette without drawing thousands of vertices.
export function downsampleElevation(values: number[], n: number): number[] {
  if (n <= 0) return [];
  if (values.length <= n) return values.slice();
  const out: number[] = [];
  const bucket = values.length / n;
  for (let i = 0; i < n; i++) {
    const start = Math.floor(i * bucket);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucket));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end && j < values.length; j++) {
      sum += values[j] as number;
      count += 1;
    }
    out.push(count > 0 ? sum / count : (values[start] ?? 0));
  }
  return out;
}

// Walked fraction (0..1) for a journey's progress, from chainage along the route.
export function progressFraction(walkedM: number, totalM: number): number {
  if (totalM <= 0) return 0;
  return Math.max(0, Math.min(1, walkedM / totalM));
}
