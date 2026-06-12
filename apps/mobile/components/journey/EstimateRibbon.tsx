import { type Section as CoreSection, planJourney } from '@roam/core';
import { StyleSheet, Text, View } from 'react-native';
import { useTrailSections } from '../../lib/hooks';
import { PACE_TARGET_M, useJourneySetupStore } from '../../store/journeySetupStore';
import { colors, layout, spacing, type } from '../../theme';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function finishLabel(fromIso: string, days: number): string {
  const d = new Date(new Date(`${fromIso.slice(0, 10)}T00:00:00`).getTime() + days * DAY_MS);
  return `~${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${days} DAYS`;
}

// Persistent estimate strip above the setup footer (steps 2 and 4) — the
// forecast finish recomputed live from the current scope/pace inputs.
export function EstimateRibbon() {
  const { trailId, scope, direction, startSectionId, endSectionId, pace, useDates, startDate } =
    useJourneySetupStore();

  const { data } = useTrailSections(String(trailId ?? 0), { query: { enabled: !!trailId } });
  const sections = Array.isArray(data?.data) ? data.data : [];

  const plan = planJourney({
    sections: sections as unknown as CoreSection[],
    direction,
    startSectionId: scope === 'section' ? (startSectionId ?? undefined) : undefined,
    endSectionId: scope === 'section' ? (endSectionId ?? undefined) : undefined,
    pace: { targetDistancePerDayM: PACE_TARGET_M[pace] },
  });
  if (plan.totalDays === 0) return null;

  const from = useDates && startDate ? startDate : new Date().toISOString();

  return (
    <View style={styles.ribbon}>
      <Text style={styles.label}>ESTIMATED COMPLETION</Text>
      <Text style={styles.value}>{finishLabel(from, plan.totalDays)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ribbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.status.progress.bg,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing[4],
  },
  label: { ...type.label, color: colors.status.progress.text },
  value: { ...type.dataS, color: colors.status.progress.text },
});
