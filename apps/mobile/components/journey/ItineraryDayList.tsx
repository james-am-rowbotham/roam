import { Fragment } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatElevationM, formatKm } from '../../lib/format';
import type { ItineraryDay, ItineraryStage } from '../../lib/itineraryDays';
import { colors, fonts, layout, radius, spacing, type } from '../../theme';
import { Icon } from '../ui';

interface Props {
  days: ItineraryDay[];
  /** Open a not-yet-walked stage on the map. */
  onPressStage: (stageId: number) => void;
  /** Open a completed day's stats screen. */
  onOpenDay: (dayNumber: number) => void;
}

// The day-grouped itinerary list (mock 846:1752): quiet day-group headers, each
// containing one or more stage rows. Progress is per stage; days are the grouping.
// A completed stage opens its day's stats; an upcoming/current stage opens the map.
export function ItineraryDayList({ days, onPressStage, onOpenDay }: Props) {
  return (
    <View>
      {days.map((day) => (
        <Fragment key={day.number}>
          {day.regionBand && (
            <View style={[styles.band, !day.regionBand.first && styles.bandCrossing]}>
              <Text style={styles.bandName}>{day.regionBand.name}</Text>
              <Text style={styles.bandRange}>{day.regionBand.rangeLabel}</Text>
            </View>
          )}
          <View style={styles.dayHeader}>
            <Text style={styles.dayLabel}>
              DAY {day.number}
              {day.dateLabel ? ` · ${day.dateLabel}` : ''}
            </Text>
            {day.rightLabel && <Text style={styles.dayRight}>{day.rightLabel}</Text>}
          </View>
          {day.stages.map((stage) => (
            <StageRow
              key={stage.id}
              stage={stage}
              onPress={() =>
                stage.status === 'done' ? onOpenDay(day.number) : onPressStage(stage.id)
              }
            />
          ))}
        </Fragment>
      ))}
    </View>
  );
}

function StageRow({ stage, onPress }: { stage: ItineraryStage; onPress: () => void }) {
  const done = stage.status === 'done';
  const current = stage.status === 'current';
  const upcoming = stage.status === 'upcoming';
  return (
    <TouchableOpacity
      style={[styles.row, current && styles.rowCurrent]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.badge, done && styles.badgeDone, current && styles.badgeCurrent]}>
        {done ? (
          <Icon name="check" size={16} color={colors.status.success.text} />
        ) : (
          <Text style={[styles.badgeNum, current && styles.badgeNumCurrent]}>{stage.number}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {stage.name}
        </Text>
        <Text style={styles.meta}>
          {[
            `Stage ${stage.number}`,
            formatKm(stage.distanceM),
            `${formatElevationM(stage.ascentM)} ↑`,
            stage.grade,
          ].join(' · ')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[5],
    paddingBottom: spacing[2],
  },
  // A region crossing mid-list gets a hairline rule + extra top space.
  bandCrossing: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    paddingTop: spacing[6],
  },
  bandName: { fontFamily: fonts.display, fontSize: 13, color: colors.text.primary },
  bandRange: { ...type.label, color: colors.text.secondary },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.subtle,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  dayLabel: { ...type.label, color: colors.text.secondary },
  dayRight: { ...type.label, color: colors.text.secondary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing[5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  rowCurrent: { backgroundColor: colors.status.progress.bg },

  badge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDone: { backgroundColor: colors.status.success.bg },
  badgeCurrent: { backgroundColor: colors.accent },
  badgeNum: { fontFamily: fonts.monoMedium, fontSize: 12, color: colors.text.primary },
  badgeNumCurrent: { color: colors.text.onAccent },

  body: { flex: 1, gap: spacing[1] },
  title: { ...type.cardTitle, color: colors.text.primary },
  titleDone: { color: colors.text.secondary },
  meta: { ...type.dataMeta, color: colors.text.secondary },

  ring: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
});
