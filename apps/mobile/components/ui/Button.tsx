import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radius, type } from '../../theme';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
}

export function Button({ label, onPress, variant = 'primary' }: Props) {
  return (
    <TouchableOpacity
      style={[styles.btn, variant === 'ghost' && styles.ghost]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ghost: { backgroundColor: 'transparent' },
  label: { ...type.cardTitle, color: colors.text.onAccent },
  ghostLabel: { color: colors.text.primary },
});
