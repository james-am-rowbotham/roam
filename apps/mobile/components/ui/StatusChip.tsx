import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '../../theme';

// Status pill in the §16 status colours. Convention: green = done,
// blue/info = active/current, neutral = upcoming, amber = caution.
export type StatusVariant = 'neutral' | 'info' | 'success' | 'warn' | 'danger';

const VARIANTS: Record<StatusVariant, { bg: string; text: string }> = {
  neutral: { bg: colors.bg.subtle, text: colors.text.secondary },
  info: colors.status.info,
  success: colors.status.success,
  warn: colors.status.warn,
  danger: colors.status.danger,
};

interface Props {
  label: string;
  variant?: StatusVariant;
}

export function StatusChip({ label, variant = 'neutral' }: Props) {
  const c = VARIANTS[variant];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.label, { color: c.text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  label: { ...type.label },
});
