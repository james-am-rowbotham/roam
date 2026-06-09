import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDateRange, formatKm } from '../../lib/format';
import type { JourneyListItem } from '../../lib/hooks';
import { colors, radius, spacing, type } from '../../theme';
import { Icon } from '../ui';
import { StatusChip } from '../ui';
import { journeyStatusChip } from './status';

interface Props {
  journey: JourneyListItem;
  trailName: string;
  onPress: () => void;
}

export function JourneyCard({ journey, trailName, onPress }: Props) {
  const chip = journeyStatusChip(journey.status);

  const distance =
    journey.startChainageM != null && journey.endChainageM != null
      ? formatKm(journey.endChainageM - journey.startChainageM)
      : null;
  const dates = formatDateRange(journey.startDate, journey.endDate);
  const meta = [distance, dates, journey.direction === 'reverse' ? 'Reversed' : null]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>
          {trailName}
        </Text>
        {meta.length > 0 && (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <StatusChip label={chip.label} variant={chip.variant} />
        <Icon name="chevron-right" size={18} color={colors.text.secondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[6],
    marginHorizontal: spacing[8],
    marginBottom: spacing[3],
  },
  left: { flex: 1, gap: spacing[1] },
  title: { ...type.cardTitle, color: colors.text.primary },
  meta: { ...type.meta, color: colors.text.secondary },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
});
