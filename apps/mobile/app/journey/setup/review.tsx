import {
  type Accommodation as CoreAccommodation,
  type Section as CoreSection,
  planJourney,
} from '@roam/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SetupScaffold } from '../../../components/journey';
import { StatusChip } from '../../../components/ui';
import { CURRENT_USER_ID } from '../../../config/user';
import { formatElevationM, formatKm } from '../../../lib/format';
import {
  createJourney,
  journeysQueryKey,
  useTrailAccommodations,
  useTrailSections,
} from '../../../lib/hooks';
import { PACE_TARGET_M, useJourneySetupStore } from '../../../store/journeySetupStore';
import { colors, radius, spacing, type } from '../../../theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const STAY_LABEL = { camping: 'Camping', refuge: 'Refuges', mixed: 'Mixed' } as const;

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellValue}>{value}</Text>
    </View>
  );
}

export default function ReviewStep() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setup = useJourneySetupStore();
  const { routeId, trailId, trailRef, name, scope, direction, accommodation, pace, guide } = setup;

  const { data: sectionsData } = useTrailSections(String(trailId ?? 0), {
    query: { enabled: !!trailId },
  });
  const { data: accData } = useTrailAccommodations(String(trailId ?? 0), {
    query: { enabled: !!trailId },
  });
  const sections = Array.isArray(sectionsData?.data) ? sectionsData.data : [];
  const accommodations = Array.isArray(accData?.data) ? accData.data : [];

  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const accById = new Map(accommodations.map((a) => [a.id, a]));

  // Plan on-device with the same engine the server uses (offline-first).
  const plan = planJourney({
    sections: sections as unknown as CoreSection[],
    direction,
    startSectionId: scope === 'section' ? (setup.startSectionId ?? undefined) : undefined,
    endSectionId: scope === 'section' ? (setup.endSectionId ?? undefined) : undefined,
    pace: { targetDistancePerDayM: PACE_TARGET_M[pace] },
    accommodation,
    accommodations: accommodations as unknown as CoreAccommodation[],
  });

  const create = useMutation({
    mutationFn: () =>
      createJourney({
        routeId: routeId ?? 0,
        userId: CURRENT_USER_ID,
        name: name.trim() || undefined,
        direction,
        accommodation,
        startSectionId: scope === 'section' ? (setup.startSectionId ?? undefined) : undefined,
        endSectionId: scope === 'section' ? (setup.endSectionId ?? undefined) : undefined,
        targetDistancePerDayM: PACE_TARGET_M[pace],
      }),
    onSuccess: (res) => {
      if ('error' in res.data) return;
      queryClient.invalidateQueries({ queryKey: journeysQueryKey({ userId: CURRENT_USER_ID }) });
      router.replace(`/journey/${res.data.id}`);
    },
  });

  const [expanded, setExpanded] = useState(false);
  const COLLAPSED = 5;
  const visibleStages = expanded ? plan.stages : plan.stages.slice(0, COLLAPSED);

  const stageTitle = (sectionIds: number[]): string => {
    const names = sectionIds.map((id) => sectionById.get(id)?.name).filter(Boolean) as string[];
    if (names.length <= 1) return names[0] ?? 'Stage';
    return `${names[0]} → ${names[names.length - 1]}`;
  };

  return (
    <SetupScaffold
      step={5}
      onClose={() => router.back()}
      onBack={() => router.back()}
      footer={
        <TouchableOpacity
          style={[styles.cta, create.isPending && styles.ctaDisabled]}
          onPress={() => create.mutate()}
          activeOpacity={0.85}
          disabled={create.isPending}
        >
          <Text style={styles.ctaLabel}>{create.isPending ? 'Creating…' : 'Start journey'}</Text>
        </TouchableOpacity>
      }
    >
      <Text style={styles.eyebrow}>STEP 5 OF 5 · REVIEW</Text>
      <Text style={styles.name}>{name || `${trailRef} journey`}</Text>
      <Text style={styles.sub}>
        {plan.totalDays} days · {formatKm(plan.totalDistanceM)}
      </Text>

      {/* Summary grid */}
      <View style={styles.grid}>
        <SummaryCell label="Trail" value={trailRef} />
        <SummaryCell label="Duration" value={`${plan.totalDays} days`} />
        <SummaryCell label="Pace" value={cap(pace)} />
        <SummaryCell label="Stay" value={STAY_LABEL[accommodation]} />
        <SummaryCell label="Guide" value={cap(guide)} />
        <SummaryCell label="Distance" value={formatKm(plan.totalDistanceM)} />
      </View>

      {/* Itinerary */}
      <Text style={styles.listHeader}>ITINERARY</Text>
      {visibleStages.map((s) => {
        const combined = s.sectionIds.length > 1;
        const overnight = accById.get(s.suggestedAccommodationId ?? -1)?.name;
        return (
          <View key={s.orderIndex} style={styles.stage}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayNum}>{s.orderIndex}</Text>
            </View>
            <View style={styles.stageBody}>
              <View style={styles.stageTitleRow}>
                <Text style={styles.stageTitle} numberOfLines={1}>
                  {stageTitle(s.sectionIds)}
                </Text>
                {combined && <StatusChip label="Combined" variant="info" />}
              </View>
              <Text style={styles.stageMeta}>
                {[
                  formatKm(s.distanceM),
                  s.ascentM != null ? `+${formatElevationM(s.ascentM)}` : null,
                  s.descentM != null ? `−${formatElevationM(s.descentM)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {overnight && (
                <Text style={styles.stageOvernight} numberOfLines={1}>
                  Stay · {overnight}
                </Text>
              )}
            </View>
          </View>
        );
      })}
      {plan.stages.length > COLLAPSED && (
        <TouchableOpacity onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
          <Text style={styles.toggle}>
            {expanded ? 'Show fewer days' : `Show all ${plan.stages.length} days`}
          </Text>
        </TouchableOpacity>
      )}
    </SetupScaffold>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.label, color: colors.text.secondary, paddingTop: spacing[2] },
  name: { ...type.sectionHeader, color: colors.text.primary, paddingTop: spacing[1] },
  sub: { ...type.meta, color: colors.text.secondary, paddingBottom: spacing[6] },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], paddingBottom: spacing[6] },
  cell: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.bg.subtle,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[1],
  },
  cellLabel: { ...type.meta, color: colors.text.secondary },
  cellValue: { ...type.cardTitle, color: colors.text.primary },

  listHeader: { ...type.label, color: colors.text.secondary, paddingBottom: spacing[3] },
  stage: {
    flexDirection: 'row',
    gap: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  dayBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { ...type.cardTitle, color: colors.text.primary },
  stageBody: { flex: 1, gap: spacing[1] },
  stageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  stageTitle: { ...type.cardTitle, color: colors.text.primary, flexShrink: 1 },
  stageMeta: { ...type.meta, color: colors.text.secondary },
  stageOvernight: { ...type.meta, color: colors.marker.refuge },
  toggle: {
    ...type.meta,
    fontFamily: type.cardTitle.fontFamily,
    color: colors.text.primary,
    paddingTop: spacing[4],
  },

  cta: {
    flex: 1,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaLabel: { ...type.cardTitle, color: colors.text.onAccent },
});
