import { downsampleElevation } from '@roam/core';
import { useId, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { Circle, ClipPath, Defs, G, Path, Rect, Svg, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../../theme';

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
  /** Show min/max elevation + distance labels (detail screens, not cards). */
  scale?: boolean;
  /** Total distance in metres — for the scale's distance label. */
  distanceM?: number;
}

const PAD_TOP = 4; // headroom so the peak isn't clipped
const POINTS = 32; // render resolution
const ACCENT_LINE = 1.75;
const INK_LINE = 1.25;
const LABEL_W = 40; // left gutter for elevation labels when scale is on
const LABEL_H = 15; // bottom gutter for the distance label

// The elevation silhouette as a filled area chart (§16). One component, three
// modes: a plain preview, a walked/remaining progress split with a position
// marker, and a finished-trail record. Optionally shows min/max + distance scale
// labels for detail screens. Pure + presentational.
export function ElevationProfile({
  data,
  mode,
  progress = 0,
  height = 38,
  scale = false,
  distanceM,
}: Props) {
  const [width, setWidth] = useState(0);
  const clipId = `ep-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const series = downsampleElevation(data ?? [], POINTS);
  const ready = width > 0 && series.length >= 2;
  const frac = Math.max(0, Math.min(1, progress));
  const isProgress = mode === 'progress';

  const padLeft = scale ? LABEL_W : 0;
  const padBottom = scale ? LABEL_H : 0;

  let linePath = '';
  let areaPath = '';
  let markerX = 0;
  let markerY = 0;
  let minE = 0;
  let maxE = 0;
  if (ready) {
    const n = series.length;
    minE = Math.min(...series);
    maxE = Math.max(...series);
    const range = maxE - minE || 1;
    const innerW = width - padLeft;
    const innerH = height - PAD_TOP - padBottom;
    const bottom = PAD_TOP + innerH;
    const xAt = (i: number) => padLeft + (i / (n - 1)) * innerW;
    const yAt = (v: number) => PAD_TOP + (1 - (v - minE) / range) * innerH;
    const pts = series.map((v, i) => [xAt(i), yAt(v)] as const);
    linePath = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    areaPath = `${linePath} L ${width.toFixed(1)} ${bottom} L ${padLeft} ${bottom} Z`;

    // Marker sits on the line at the walked fraction; sample y by interpolation.
    markerX = padLeft + frac * innerW;
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

  // Base layer: ink (under the remaining portion in progress) or accent otherwise.
  const baseColor = isProgress ? colors.text.primary : colors.accent;
  const baseFillOpacity = isProgress ? 0.1 : mode === 'complete' ? 0.22 : 0.18;
  const baseLineOpacity = isProgress ? 0.28 : 1;
  const baseLineWidth = isProgress ? INK_LINE : ACCENT_LINE;
  const label = (text: string, x: number, y: number, anchor: 'start' | 'end') => (
    <SvgText
      x={x}
      y={y}
      fontSize={9}
      fontFamily={fonts.mono}
      fill={colors.text.secondary}
      textAnchor={anchor}
    >
      {text}
    </SvgText>
  );

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

          {/* Walked overlay + position marker (progress only, once underway) */}
          {isProgress && frac > 0 && (
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

          {/* Scale labels (detail screens) */}
          {scale && (
            <>
              {label(`${Math.round(maxE)} m`, padLeft - 6, PAD_TOP + 7, 'end')}
              {label(`${Math.round(minE)} m`, padLeft - 6, height - padBottom, 'end')}
              {distanceM != null &&
                label(`${(distanceM / 1000).toFixed(1)} km`, width, height - 3, 'end')}
            </>
          )}
        </Svg>
      )}
    </View>
  );
}
