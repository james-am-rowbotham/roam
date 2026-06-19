import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../../theme';
import { ElevationProfile } from '../trail/ElevationProfile';

// Elevation chart — two variants (Implementation Pass; Figma stage 1069:2234 vs section).
//  · 'single'  — a single stage: discrete rounded BARS (the stage screen).
//  · 'multiDay'— a section / whole trail: the continuous filled SILHOUETTE.
// Both carry the same header: gained/lost on the left, high point on the right. Driven
// by `points: { distanceKm, elevM }[]`; ascent/descent/high are derived from them.

type Variant = 'single' | 'multiDay';

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

export function ElevationChart({
  points,
  variant = 'single',
}: {
  points: { distanceKm: number; elevM: number }[];
  variant?: Variant;
}) {
  if (points.length < 2) return null;
  const { high, ascent, descent } = derive(points);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{`+${fmt(ascent)} m / −${fmt(descent)} m`}</Text>
        <Text style={styles.headerText}>{`HIGH ${fmt(high)} m`}</Text>
      </View>

      {/* A single stage uses the default resolution; a whole-trail / section profile
          renders at high resolution so EVERY day's climb shows, not a 24-bar reduction. */}
      <ElevationProfile
        data={points.map((p) => p.elevM)}
        mode="preview"
        height={variant === 'multiDay' ? 96 : 80}
        resolution={variant === 'multiDay' ? Math.min(points.length, 200) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  headerText: { ...type.label, color: colors.text.secondary },
});
