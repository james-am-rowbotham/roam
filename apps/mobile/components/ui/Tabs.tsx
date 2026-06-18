import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, type } from '../../theme';

interface Tab<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
}

// Underline tabs — NAVIGATE to a different view (Implementation Pass §6.2): Trail
// `Guide | Route`, Peak `Guide | Routes`, Section `Overview | Stages`. Semantically and
// visually distinct from the pill `Segmented` (which swaps content facets in place):
// a bottom hairline with an accent underline under the active tab, no fill.
export function Tabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <View style={styles.row}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <TouchableOpacity
            key={t.value}
            style={styles.tab}
            onPress={() => onChange(t.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
              {t.label}
            </Text>
            <View style={[styles.underline, active && styles.underlineActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
    paddingLeft: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  tab: { alignItems: 'center', gap: 7, paddingTop: 12, paddingHorizontal: 8 },
  label: { ...type.detailTab },
  labelActive: { color: colors.text.primary },
  labelInactive: { color: colors.text.secondary },
  underline: { height: 1.5, alignSelf: 'stretch', backgroundColor: 'transparent' },
  underlineActive: { backgroundColor: colors.accent },
});
