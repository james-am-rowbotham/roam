import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, type } from '../../theme';
import { Icon } from './Icon';

interface Props {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}

// A large selectable card with a title (+ check when selected) and a subtitle.
// Used for the pace and guide-preset choices.
export function OptionCard({ title, subtitle, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected ? styles.cardSelected : styles.cardDefault]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {selected && <Icon name="check" size={16} color={colors.text.primary} />}
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    padding: spacing[6],
    gap: spacing[1],
  },
  cardDefault: { borderColor: colors.border.default, backgroundColor: colors.bg.surface },
  cardSelected: { borderColor: colors.accent, backgroundColor: colors.bg.subtle },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  title: { ...type.cardTitle, color: colors.text.primary },
  subtitle: { ...type.meta, color: colors.text.secondary },
});
