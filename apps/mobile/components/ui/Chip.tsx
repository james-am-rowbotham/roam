import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radius, type } from '../../theme';

// Option chip — mirrors the Figma "Option Chip" set (node 631:106). The one
// pill pattern for map filters, filter-sheet groups, season chips, search
// suggestions and the Stage Complete decision chips. A dismissible chip
// ("GR11 ✕") is selected + suffix.
interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Trailing glyph, e.g. '✕' on a dismissible filter chip. */
  suffix?: string;
  disabled?: boolean;
}

export function Chip({ label, selected, onPress, suffix, disabled }: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, selected ? styles.selected : styles.default]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[styles.label, { color: selected ? colors.text.onAccent : colors.text.primary }]}>
        {label}
      </Text>
      {suffix && (
        <Text
          style={[
            styles.label,
            styles.suffix,
            { color: selected ? colors.text.onAccent : colors.text.secondary },
          ]}
        >
          {suffix}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  default: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  selected: {
    backgroundColor: colors.accent,
    // Border kept (in accent) so selected and default chips share a height.
    borderWidth: 1,
    borderColor: colors.accent,
  },
  label: { ...type.bodyStrong },
  suffix: { opacity: 0.8 },
});
