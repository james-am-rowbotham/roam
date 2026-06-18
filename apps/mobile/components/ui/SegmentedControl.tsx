import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius } from '../../theme';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

// Segmented control (Implementation Pass §6.2 facets; Figma subtabs 1130:2319) — a
// subtle full-width track with equal segments; the active segment is a surface-filled
// pill (SemiBold, primary), the rest transparent (Medium, secondary). This is the
// "swap content facets in place" control (Guide Overview | Planning | Environment),
// distinct from the accent-pill setup `Segmented` and the underline `Tabs`.
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[styles.seg, active && styles.segActive]}
            onPress={() => onChange(o.value)}
            activeOpacity={0.8}
          >
            <Text style={active ? styles.labelActive : styles.labelInactive}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.bg.subtle,
    padding: 4,
    borderRadius: radius.full,
  },
  seg: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  segActive: { backgroundColor: colors.bg.surface },
  labelActive: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text.primary },
  labelInactive: { fontFamily: fonts.medium, fontSize: 13, color: colors.text.secondary },
});
