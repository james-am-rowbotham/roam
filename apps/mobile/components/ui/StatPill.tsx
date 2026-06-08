import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../../theme';

interface Props {
  value: string;
  label: string;
}

export function StatPill({ value, label }: Props) {
  return (
    <View style={styles.pill}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flex: 1, alignItems: 'center', gap: 1 },
  value: { ...type.statValue, color: colors.text.primary },
  label: { ...type.meta, color: colors.text.secondary },
});
