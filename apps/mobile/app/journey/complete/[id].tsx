import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ElevationProfile } from '../../../components/trail';
import { Button, Icon } from '../../../components/ui';
import { formatElevationM, formatKm, orientRoute, routeChainPlaces } from '../../../lib/format';
import { useJourney, useTrailSections, useTrails } from '../../../lib/hooks';
import { formatElapsed } from '../../../lib/itineraryDays';
import { sectionsForDay } from '../../../lib/sections';
import { colors, layout, radius, spacing, type } from '../../../theme';

interface SectionRange {
  id: number;
  name: string;
  startChainageM: number;
  endChainageM: number;
  imageUrl?: string | null;
}

function routeLabel(secs: SectionRange[], reverse: boolean, fallback: string): string {
  return routeChainPlaces(secs.map((s) => orientRoute(s.name, reverse))).join(' → ') || fallback;
}

export default function StageCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: journeyResponse, isLoading } = useJourney(id);
  const rawJourney = journeyResponse?.data;
  const journey = rawJourney && !('error' in rawJourney) ? rawJourney : null;

  const { data: trailsData } = useTrails();
  const trail = trailsData?.data?.find((t) => t.routeId === journey?.routeId);
  const { data: sectionsResponse } = useTrailSections(String(trail?.id ?? 0), {
    query: { enabled: !!trail?.id },
  });

  if (isLoading || !journey) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const reverse = journey.direction === 'reverse';
  const sections = (
    Array.isArray(sectionsResponse?.data) ? sectionsResponse.data : []
  ) as SectionRange[];
  const walkStages = journey.stages.filter((s) => !s.restDay);

  // The stage just finished = the highest-ordered completed walking stage.
  const completed = walkStages.filter((s) => s.status === 'completed');
  const finishedStage = completed[completed.length - 1] ?? walkStages[0];
  const nextStage = walkStages.find((s) => s.status !== 'completed') ?? null;

  if (!finishedStage) {
    return (
      <View style={styles.loading}>
        <Text style={styles.statLabel}>Nothing to show.</Text>
      </View>
    );
  }

  const stageNum = Math.max(1, walkStages.findIndex((s) => s.id === finishedStage.id) + 1);
  const fSecs = sectionsForDay(sections, finishedStage.startChainageM, finishedStage.endChainageM);
  const fLabel = routeLabel(fSecs, reverse, `Stage ${stageNum}`);
  const heroImage = fSecs.find((s) => s.imageUrl)?.imageUrl ?? null;

  // The completed stage's terrain — slice the trail elevation profile to its chainage.
  const elevation = trail?.elevation ?? [];
  const trailTotalM = trail?.distanceM ?? 0;
  const eLo = Math.min(finishedStage.startChainageM, finishedStage.endChainageM);
  const eHi = Math.max(finishedStage.startChainageM, finishedStage.endChainageM);
  const elevationSlice =
    elevation.length > 1 && trailTotalM > 0
      ? elevation.slice(
          Math.floor((eLo / trailTotalM) * elevation.length),
          Math.max(
            Math.ceil((eHi / trailTotalM) * elevation.length),
            Math.floor((eLo / trailTotalM) * elevation.length) + 2,
          ),
        )
      : [];

  const journeyDone = journey.status === 'completed' || !nextStage;
  let nextLabel = '';
  let nextStageNum = stageNum + 1;
  if (nextStage) {
    nextLabel = routeLabel(
      sectionsForDay(sections, nextStage.startChainageM, nextStage.endChainageM),
      reverse,
      'Next stage',
    );
    nextStageNum = walkStages.findIndex((s) => s.id === nextStage.id) + 1;
  }

  // Guide lead-in for the next stage — phrased about the stage, not "tomorrow".
  const shortNext = (nextStage?.distanceM ?? 0) > 0 && (nextStage?.distanceM ?? 0) < 16_000;
  const leadIn = shortNext
    ? 'A short stage next — an easy one whenever you set off.'
    : 'The next stage is ready — start it when you are.';

  // Start the next stage = back on the live map. No day decisions, no bookings,
  // no combine/split — the screen is "here's the next stage, start it when ready".
  const startNext = () => router.replace(`/journey/active/${id}`);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {heroImage && (
            <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
          <View style={styles.heroOverlay} />
          <View style={[styles.heroContent, { paddingTop: insets.top + spacing[12] }]}>
            <Text style={styles.heroEyebrow}>STAGE {stageNum} COMPLETE</Text>
            <Text style={styles.heroTitle}>{fLabel}</Text>
          </View>
        </View>

        {/* Full stats for the stage just walked */}
        <View style={styles.stats}>
          <Stat value={formatKm(finishedStage.distanceM)} label="walked" />
          <View style={styles.statDivider} />
          <Stat value={`↑${formatElevationM(finishedStage.ascentM)}`} label="ascent" />
          <View style={styles.statDivider} />
          <Stat value={`↓${formatElevationM(finishedStage.descentM)}`} label="descent" />
          <View style={styles.statDivider} />
          <Stat
            value={
              finishedStage.elapsedSeconds != null
                ? formatElapsed(finishedStage.elapsedSeconds)
                : '—'
            }
            label="time"
          />
        </View>

        {elevationSlice.length > 1 && (
          <View style={styles.elevation}>
            <ElevationProfile
              data={elevationSlice}
              mode="complete"
              height={64}
              scale
              distanceM={finishedStage.distanceM ?? 0}
            />
          </View>
        )}

        <Text style={styles.progressLine}>
          {completed.length} of {walkStages.length} stages done
        </Text>

        {/* Next stage / journey complete */}
        <View style={styles.content}>
          {journeyDone ? (
            <View style={styles.doneCard}>
              <Text style={styles.doneEmoji}>🎉</Text>
              <Text style={styles.doneTitle}>Journey complete</Text>
              <Text style={styles.doneBody}>
                You've finished every stage of this journey. It stays in your journeys.
              </Text>
            </View>
          ) : (
            <View style={styles.nextCard}>
              <Text style={styles.cardEyebrow}>NEXT STAGE</Text>
              <Text style={styles.nextTitle}>
                Stage {nextStageNum} · {nextLabel}
              </Text>
              {nextStage && (
                <Text style={styles.nextMeta}>
                  {formatKm(nextStage.distanceM)} · ↑{formatElevationM(nextStage.ascentM)}
                </Text>
              )}
              <Text style={styles.leadIn}>{leadIn}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + layout.ctaBarPadding }]}>
        {journeyDone ? (
          <Button label="View journey" onPress={() => router.replace(`/journey/${id}`)} />
        ) : (
          <>
            <Button label="Start now" onPress={startNext} />
            {/* An exit that isn't "start walking" — review the plan, rest, decide later. */}
            <Button
              variant="outline"
              label="Back to itinerary"
              onPress={() => router.replace(`/journey/${id}`)}
            />
          </>
        )}
      </View>

      {/* Back */}
      <View style={[styles.backWrap, { top: insets.top + 8 }]}>
        <Icon name="check" size={18} color={colors.text.onAccent} />
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.app,
  },

  hero: {
    height: 240,
    backgroundColor: colors.bg.subtle,
    justifyContent: 'flex-end',
  },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay.dark },
  heroContent: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing[8] },
  heroEyebrow: { ...type.label, color: colors.overlay.onImageMuted },
  heroTitle: {
    fontFamily: type.sectionHeader.fontFamily,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
    color: colors.overlay.onImage,
    paddingTop: spacing[2],
  },
  backWrap: {
    position: 'absolute',
    right: spacing[8],
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.status.success.text,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing[8],
    paddingBottom: spacing[4],
    paddingHorizontal: layout.screenPadding,
    backgroundColor: colors.bg.surface,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing[1] },
  statValue: { ...type.statValue, color: colors.text.primary },
  statLabel: { ...type.meta, color: colors.text.secondary },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border.default },

  elevation: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing[2],
    backgroundColor: colors.bg.surface,
  },
  progressLine: {
    ...type.meta,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing[5],
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },

  content: { padding: layout.screenPadding, gap: spacing[6] },
  cardEyebrow: { ...type.label, color: colors.text.secondary },
  nextCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[6],
    gap: spacing[2],
  },
  nextTitle: { ...type.cardTitle, color: colors.text.primary },
  nextMeta: { ...type.meta, color: colors.text.secondary },
  leadIn: { ...type.meta, color: colors.text.secondary, paddingTop: spacing[2] },

  doneCard: {
    backgroundColor: colors.status.success.bg,
    borderRadius: radius.lg,
    padding: spacing[8],
    alignItems: 'center',
    gap: spacing[2],
  },
  doneEmoji: { fontSize: 32 },
  doneTitle: { ...type.sectionHeader, color: colors.status.success.text },
  doneBody: { ...type.meta, color: colors.status.success.text, textAlign: 'center' },

  ctaWrap: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[4],
    gap: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
});
