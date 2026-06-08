import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, type } from '../../theme';
import { Icon } from './Icon';

interface Props {
  placeholder?: string;
  onPress?: () => void;
}

export function SearchField({ placeholder = 'Search trails, peaks, refuges…', onPress }: Props) {
  return (
    <TouchableOpacity style={styles.wrap} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.pill}>
        <Icon name="search" size={18} color={colors.text.secondary} />
        <Text style={styles.placeholder} numberOfLines={1}>
          {placeholder}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing[8], paddingVertical: spacing[6] },
  pill: {
    backgroundColor: colors.bg.input,
    borderRadius: radius.full,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholder: { ...type.bodyLarge, color: colors.text.secondary },
});
