import { useWindowDimensions } from 'react-native';
import { Path, Svg, Text as SvgText } from 'react-native-svg';
import { colors, layout } from '../../theme';

interface Props {
  ascentM: number | null | undefined;
  descentM: number | null | undefined;
  distanceM: number | null | undefined;
}

export function ElevationChart({ ascentM, descentM, distanceM }: Props) {
  const { width } = useWindowDimensions();
  const chartW = width - layout.screenPadding * 2;
  const chartH = 80;
  const padLeft = 48;
  const padRight = 8;
  const padTop = 12;
  const padBottom = 20;

  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;

  // Build a plausible elevation profile from ascent/descent totals.
  // Shape: flat start, climb to peak around 60% of the way, descend to end.
  const asc = ascentM ?? 0;
  const desc = descentM ?? 0;
  const dist = distanceM ?? 1;
  const peakFrac = 0.6; // peak at 60% of distance

  // Elevation values at key points (relative, starting at 0)
  const e0 = 0;
  const ePeak = asc;
  const eEnd = asc - desc;

  const allE = [e0, ePeak, eEnd];
  const minE = Math.min(...allE);
  const maxE = Math.max(...allE);
  const range = maxE - minE || 1;

  const toX = (frac: number) => padLeft + frac * innerW;
  const toY = (e: number) => padTop + innerH - ((e - minE) / range) * innerH;

  // Build smooth SVG path with cubic bezier through 5 points
  const pts: [number, number][] = [
    [toX(0), toY(e0)],
    [toX(0.25), toY(e0 + asc * 0.3)],
    [toX(peakFrac), toY(ePeak)],
    [toX(0.8), toY(ePeak - desc * 0.4)],
    [toX(1), toY(eEnd)],
  ];

  const first = pts[0] ?? [toX(0), toY(e0)];
  let d = `M ${first[0]} ${first[1]}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1] ?? first;
    const curr = pts[i] ?? first;
    const cpX = (prev[0] + curr[0]) / 2;
    d += ` C ${cpX} ${prev[1]}, ${cpX} ${curr[1]}, ${curr[0]} ${curr[1]}`;
  }

  // Closed fill path
  const lastX = pts[pts.length - 1]?.[0] ?? 0;
  const firstX = pts[0]?.[0] ?? 0;
  const fill = `${d} L ${lastX} ${padTop + innerH} L ${firstX} ${padTop + innerH} Z`;

  const highLabel = `${Math.round(maxE / 100) * 100} m`;
  const lowLabel = `${Math.round(minE / 100) * 100} m`;
  const distLabel = distanceM ? `${(distanceM / 1000).toFixed(1)} km` : '';

  return (
    <Svg width={chartW} height={chartH}>
      {/* Fill */}
      <Path d={fill} fill={colors.status.success.bg} />
      {/* Line */}
      <Path d={d} fill="none" stroke={colors.status.success.text} strokeWidth={1.5} />

      {/* Y-axis labels */}
      <SvgText
        x={padLeft - 6}
        y={padTop + 4}
        fontSize={10}
        fill={colors.text.secondary}
        textAnchor="end"
      >
        {highLabel}
      </SvgText>
      <SvgText
        x={padLeft - 6}
        y={padTop + innerH}
        fontSize={10}
        fill={colors.text.secondary}
        textAnchor="end"
      >
        {lowLabel}
      </SvgText>

      {/* X-axis distance label */}
      <SvgText
        x={padLeft + innerW}
        y={chartH - 4}
        fontSize={10}
        fill={colors.text.secondary}
        textAnchor="end"
      >
        {distLabel}
      </SvgText>
    </Svg>
  );
}
