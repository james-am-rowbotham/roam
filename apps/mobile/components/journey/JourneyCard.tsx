import { progressFraction } from '@roam/core';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatKm } from '../../lib/format';
import type { JourneyListItem } from '../../lib/hooks';
import { colors, radius, spacing, type } from '../../theme';
import { ElevationProfile } from '../trail';
import { Button, StatusChip } from '../ui';

interface Props {
  journey: JourneyListItem;
  trailName: string;
  /** The route's elevation silhouette (from the trail list). */
  elevation: number[];
  /** Open the journey (itinerary / settings). */
  onOpen: () => void;
  /** Open the full-screen active map (active/paused journeys only). */
  onMap: () => void;
  /** Button-less variant (e.g. the Home "My journeys" card) — tap opens it. */
  compact?: boolean;
}

export function JourneyCard({ journey, trailName, elevation, onOpen, onMap, compact }: Props) {
  const title = journey.name?.trim() || trailName;
  const isActive = journey.status === 'active';
  const isPaused = journey.status === 'paused';
  const isCompleted = journey.status === 'completed' || journey.status === 'abandoned';
  // Active and paused journeys are both "in progress" — only the action differs.
  const inProgress = isActive || isPaused;

  const total = journey.totalDays || 0;
  const done = journey.completedDays || 0;
  const currentDay = Math.min(done + 1, total || 1);
  // Elevation silhouette: walked split for in-progress, all-green when finished.
  const epMode = isCompleted ? 'complete' : inProgress ? 'progress' : 'preview';
  const walked = progressFraction(journey.doneDistanceM ?? 0, journey.totalDistanceM ?? 0);

  const chip = isCompleted
    ? { label: '✓ Complete', variant: 'success' as const }
    : isPaused
      ? { label: `Paused · Day ${currentDay}`, variant: 'warn' as const }
      : isActive
        ? { label: `Day ${currentDay} of ${total}`, variant: 'progress' as const }
        : { label: 'Planned', variant: 'progress' as const };

  const meta = inProgress
    ? `${formatKm(journey.doneDistanceM || 0)} of ${formatKm(journey.totalDistanceM || 0)}`
    : isCompleted
      ? `${total} days · ${formatKm(journey.totalDistanceM || 0)} · all sections complete`
      : `${total} days · ${formatKm(journey.totalDistanceM || 0)}`;

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.9}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <StatusChip label={chip.label} variant={chip.variant} />
      </View>

      {elevation.length > 0 && (
        <ElevationProfile data={elevation} mode={epMode} progress={walked} />
      )}

      <Text style={styles.meta} numberOfLines={1}>
        {meta}
      </Text>

      {isActive && !compact && (
        <View style={styles.actions}>
          <Button label="Open in map" size="sm" grow onPress={onMap} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[6],
    marginHorizontal: spacing[8],
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  title: { ...type.cardTitle, color: colors.text.primary, flex: 1 },

  meta: { ...type.meta, color: colors.text.secondary },

  actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
});
