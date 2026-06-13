import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../../theme';
import { Icon } from '../ui';
import type { IconName } from '../ui';

interface Props {
  color: string;
  icon: IconName;
  title: string;
  body: string;
}

export function SummaryRow({ color, icon, title, body }: Props) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={18} color={colors.overlay.onImage} />
      </View>
      <View style={styles.summaryText}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={styles.summaryBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: spacing[6], alignItems: 'flex-start' },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1, gap: 2 },
  summaryTitle: { ...type.cardTitle, color: colors.text.primary },
  summaryBody: { ...type.meta, color: colors.text.secondary, lineHeight: 18 },
});
