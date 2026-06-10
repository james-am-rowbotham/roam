import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radius, type } from '../../theme';

// Button variants. `danger` is the solid destructive CTA from the design system
// (Figma "CTA Button / Style=Danger"); `dangerSubtle` (tonal) and `dangerGhost`
// (text-only) are quieter destructive treatments for secondary placements.
export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'dangerSubtle' | 'dangerGhost';

const VARIANTS: Record<ButtonVariant, { bg: string; label: string }> = {
  primary: { bg: colors.accent, label: colors.text.onAccent },
  ghost: { bg: 'transparent', label: colors.text.primary },
  danger: { bg: colors.status.danger.text, label: colors.text.onAccent },
  dangerSubtle: { bg: colors.status.danger.bg, label: colors.status.danger.text },
  dangerGhost: { bg: 'transparent', label: colors.status.danger.text },
};

interface Props {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled }: Props) {
  const v = VARIANTS[variant];
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: v.bg }, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={[styles.label, { color: v.label }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  disabled: { opacity: 0.5 },
  label: { ...type.cardTitle },
});
