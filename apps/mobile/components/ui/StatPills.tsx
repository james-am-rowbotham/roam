import type { Stat } from '@roam/content';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import { StatPill } from './StatPill';

// The at-a-glance stat row (Implementation Pass §7.3, Figma 43:23) — driven entirely
// by `atAGlance: Stat[]`, so ONE component renders every screen. A trail leads with
// distance, a peak with summit/grade — that difference lives in the data, not here.
// Dividers between pills mirror the design.
function format(stat: Stat): string {
  const base = stat.valueMax != null ? `${stat.value}–${stat.valueMax}` : `${stat.value}`;
  return stat.unit ? `${base} ${stat.unit}` : base;
}

export function StatPills({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.row}>
      {stats.map((s, i) => (
        <View key={s.key} style={styles.cell}>
          {i > 0 && <View style={styles.divider} />}
          <StatPill value={format(s)} label={s.label} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.border.default },
});
