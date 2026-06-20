import { ElevationProfile } from '../trail/ElevationProfile';

// Elevation silhouette — the route/section/stage profile. The gained/lost/high stat panel
// was removed (it duplicated the screen's stat pills); ascent now lives in those pills.
//  · 'single'   — a single stage (default resolution).
//  · 'multiDay' — a section / whole trail, high-resolution so every day's climb shows.
type Variant = 'single' | 'multiDay';

export function ElevationChart({
  points,
  variant = 'single',
}: {
  points: { distanceKm: number; elevM: number }[];
  variant?: Variant;
}) {
  if (points.length < 2) return null;
  return (
    <ElevationProfile
      data={points.map((p) => p.elevM)}
      mode="preview"
      height={variant === 'multiDay' ? 96 : 80}
      resolution={variant === 'multiDay' ? Math.min(points.length, 200) : undefined}
    />
  );
}
