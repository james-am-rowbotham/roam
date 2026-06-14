import { downsampleElevation } from '@roam/core';
import { useId, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { Circle, ClipPath, Defs, G, Path, Rect, Svg } from 'react-native-svg';
import { colors } from '../../theme';

type Mode = 'preview' | 'progress' | 'complete';

interface Props {
  /** Elevation samples, any length — the component normalises + downsamples. */
  data: number[];
  /** preview = one colour · progress = walked/remaining split · complete = all green. */
  mode: Mode;
  /** Walked fraction 0..1 — required for `progress`. */
  progress?: number;
  /** Chart height in px. */
  height?: number;
}

const PAD_TOP = 4; // headroom so the peak isn't clipped
const POINTS = 32; // render resolution
const ACCENT_LINE = 1.75;
const INK_LINE = 1.25;

// The elevation silhouette as a filled area chart (§16). One component, three
// modes: a plain preview, a walked/remaining progress split with a position
// marker, and a finished-trail record. Pure + presentational — the caller
// supplies the elevation array and (for progress) the walked fraction.
export function ElevationProfile({ data, mode, progress = 0, height = 38 }: Props) {
  const [width, setWidth] = useState(0);
  const clipId = `ep-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const series = downsampleElevation(data ?? [], POINTS);
  const ready = width > 0 && series.length >= 2;

  let linePath = '';
  let areaPath = '';
  let markerX = 0;
  let markerY = 0;
  if (ready) {
    const n = series.length;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const innerH = height - PAD_TOP;
    const xAt = (i: number) => (i / (n - 1)) * width;
    const yAt = (v: number) => PAD_TOP + (1 - (v - min) / range) * innerH;
    const pts = series.map((v, i) => [xAt(i), yAt(v)] as const);
    linePath = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    areaPath = `${linePath} L ${width.toFixed(1)} ${height} L 0 ${height} Z`;

    // Marker sits on the line at the walked fraction; sample y by interpolation.
    const frac = Math.max(0, Math.min(1, progress));
    markerX = frac * width;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1] as readonly [number, number];
      const b = pts[i] as readonly [number, number];
      if (markerX <= b[0]) {
        const t = b[0] === a[0] ? 0 : (markerX - a[0]) / (b[0] - a[0]);
        markerY = a[1] + (b[1] - a[1]) * t;
        break;
      }
      markerY = b[1];
    }
  }

  const isProgress = mode === 'progress';
  // Base layer: ink (under the remaining portion in progress) or accent otherwise.
  const baseColor = isProgress ? colors.text.primary : colors.accent;
  const baseFillOpacity = isProgress ? 0.1 : mode === 'complete' ? 0.22 : 0.18;
  const baseLineOpacity = isProgress ? 0.28 : 1;
  const baseLineWidth = isProgress ? INK_LINE : ACCENT_LINE;

  return (
    <View onLayout={onLayout} style={{ height }}>
      {ready && (
        <Svg width={width} height={height}>
          {isProgress && (
            <Defs>
              <ClipPath id={clipId}>
                <Rect x={0} y={0} width={markerX} height={height} />
              </ClipPath>
            </Defs>
          )}

          {/* Base silhouette */}
          <Path d={areaPath} fill={baseColor} fillOpacity={baseFillOpacity} />
          <Path
            d={linePath}
            fill="none"
            stroke={baseColor}
            strokeOpacity={baseLineOpacity}
            strokeWidth={baseLineWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Walked overlay + position marker (progress only) */}
          {isProgress && (
            <>
              <G clipPath={`url(#${clipId})`}>
                <Path d={areaPath} fill={colors.accent} fillOpacity={0.22} />
                <Path
                  d={linePath}
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth={ACCENT_LINE}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </G>
              <Circle
                cx={markerX}
                cy={markerY}
                r={4}
                fill={colors.accent}
                stroke={colors.bg.surface}
                strokeWidth={2}
              />
            </>
          )}
        </Svg>
      )}
    </View>
  );
}
