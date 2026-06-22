import { meters } from '@/lib/format';

// The elevation silhouette — a filled area chart (the web cousin of the app's
// <ElevationProfile>, §16). Pure SVG so it server-renders with zero JS. Takes
// the trail's sampled elevation array (from the API) and draws a normalised
// accent-filled profile, wrapped in axis labels: an "Elevation" caption + the
// min–max range (y), and optional start/end labels (x). Labels are built in so
// every chart is properly labelled wherever it's used.
export function ElevationProfile({
  data,
  height = 120,
  startLabel,
  endLabel,
  showStats = true,
}: {
  data: number[];
  height?: number;
  /** x-axis end labels (place names or distances); omitted when unknown. */
  startLabel?: string | null;
  endLabel?: string | null;
  /** The "Elevation · min–max m" caption row. */
  showStats?: boolean;
}) {
  if (data.length < 2) return null;

  const W = 1000;
  const H = 100;
  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);

  const line = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  return (
    <div className="flex flex-col gap-2">
      {showStats && (
        <div className="flex items-center justify-between">
          <span className="label-mono text-[12px] text-secondary">Elevation</span>
          <span className="label-mono text-[12px] text-secondary">
            {meters(min)}–{meters(max)} m
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        role="img"
        aria-label={`Elevation profile from ${meters(min)} to ${meters(max)}`}
      >
        <title>Elevation profile</title>
        <path d={area} fill="var(--color-accent)" fillOpacity={0.18} />
        <path
          d={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {(startLabel || endLabel) && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] text-secondary">{startLabel}</span>
          <span className="font-mono text-[12px] text-secondary">{endLabel}</span>
        </div>
      )}
    </div>
  );
}
