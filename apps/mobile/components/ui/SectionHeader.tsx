import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../../theme';

interface Props {
  title: string;
}

export function SectionHeader({ title }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing[8],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
  },
  title: { ...type.sectionHeader, color: colors.text.primary },
});
