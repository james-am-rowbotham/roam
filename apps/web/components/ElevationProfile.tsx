// The elevation silhouette — a filled area chart (the web cousin of the app's
// <ElevationProfile>, §16). Pure SVG so it server-renders with zero JS. Takes
// the trail's sampled elevation array (from the API) and draws a normalised
// accent-filled profile.
export function ElevationProfile({
  data,
  height = 120,
}: {
  data: number[];
  height?: number;
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
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      role="img"
      aria-label="Elevation profile"
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
  );
}
