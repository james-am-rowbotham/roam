import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, type } from '../../theme';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

// Row of pill toggles — active pill is filled accent, others are subtle. Used by
// the setup steps (scope, accommodation, pace, guide).
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[styles.seg, active ? styles.segActive : styles.segInactive]}
            onPress={() => onChange(o.value)}
            activeOpacity={0.85}
          >
            <Text style={active ? styles.labelActive : styles.labelInactive}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing[3] },
  seg: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segActive: { backgroundColor: colors.accent },
  segInactive: { backgroundColor: colors.bg.subtle },
  labelActive: { ...type.body, fontFamily: type.cardTitle.fontFamily, color: colors.text.onAccent },
  labelInactive: {
    ...type.body,
    fontFamily: type.cardTitle.fontFamily,
    color: colors.text.secondary,
  },
});
