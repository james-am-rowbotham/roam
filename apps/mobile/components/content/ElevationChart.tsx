import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../../theme';
import { ElevationProfile } from '../trail/ElevationProfile';

// Elevation chart — two variants (Implementation Pass; Figma stage 1069:2234 vs section).
//  · 'single'  — a single stage: discrete rounded BARS (the stage screen).
//  · 'multiDay'— a section / whole trail: the continuous filled SILHOUETTE.
// Both carry the same header: gained/lost on the left, high point on the right. Driven
// by `points: { distanceKm, elevM }[]`; ascent/descent/high are derived from them.

type Variant = 'single' | 'multiDay';
const BARS = 24;

const fmt = (m: number) => Math.round(m).toLocaleString('en-US');

function derive(points: { elevM: number }[]) {
  const elevs = points.map((p) => p.elevM);
  let ascent = 0;
  let descent = 0;
  for (let i = 1; i < elevs.length; i++) {
    const d = (elevs[i] ?? 0) - (elevs[i - 1] ?? 0);
    if (d > 0) ascent += d;
    else descent -= d;
  }
  return { high: Math.max(...elevs), low: Math.min(...elevs), ascent, descent };
}

// Evenly sample to ~BARS points so the bar count is stable regardless of input length.
function sample(elevs: number[], n: number): number[] {
  if (elevs.length <= n) return elevs;
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(elevs[Math.floor((i * (elevs.length - 1)) / (n - 1))] ?? 0);
  return out;
}

export function ElevationChart({
  points,
  variant = 'single',
}: {
  points: { distanceKm: number; elevM: number }[];
  variant?: Variant;
}) {
  if (points.length < 2) return null;
  const { high, low, ascent, descent } = derive(points);
  const span = high - low || 1;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{`+${fmt(ascent)} m / −${fmt(descent)} m`}</Text>
        <Text style={styles.headerText}>{`HIGH ${fmt(high)} m`}</Text>
      </View>

      {variant === 'single' ? (
        // A single stage / peak route reads better as a continuous silhouette.
        <ElevationProfile data={points.map((p) => p.elevM)} mode="preview" height={80} />
      ) : (
        // Sections / whole trails (many stages) read better as columns.
        <View style={styles.bars}>
          {sample(
            points.map((p) => p.elevM),
            BARS,
          ).map((e, i) => (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: positional bars, no stable id
              key={i}
              style={[styles.bar, { height: `${(0.15 + 0.85 * ((e - low) / span)) * 100}%` }]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  headerText: { ...type.label, color: colors.text.secondary },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 80 },
  bar: { flex: 1, backgroundColor: colors.accent, borderRadius: 2 },
});
