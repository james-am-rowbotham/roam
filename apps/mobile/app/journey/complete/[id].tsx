import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon } from '../../../components/ui';
import { formatElevationM, formatKm, orientRoute, routeChainPlaces } from '../../../lib/format';
import { useJourney, useTrailSections, useTrails } from '../../../lib/hooks';
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

  // The day just finished = the highest-ordered completed walking day.
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

  const dayNum = Math.max(1, walkStages.findIndex((s) => s.id === finishedStage.id) + 1);
  const fSecs = sectionsForDay(sections, finishedStage.startChainageM, finishedStage.endChainageM);
  const fLabel = routeLabel(fSecs, reverse, `Day ${dayNum}`);
  const heroImage = fSecs.find((s) => s.imageUrl)?.imageUrl ?? null;

  const journeyDone = journey.status === 'completed' || !nextStage;
  let nextLabel = '';
  let nextDayNum = dayNum + 1;
  if (nextStage) {
    nextLabel = routeLabel(
      sectionsForDay(sections, nextStage.startChainageM, nextStage.endChainageM),
      reverse,
      'Next day',
    );
    nextDayNum = walkStages.findIndex((s) => s.id === nextStage.id) + 1;
  }

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
            <Text style={styles.heroEyebrow}>DAY {dayNum} COMPLETE</Text>
            <Text style={styles.heroTitle}>{fLabel}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatKm(finishedStage.distanceM)}</Text>
            <Text style={styles.statLabel}>today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>↑{formatElevationM(finishedStage.ascentM)}</Text>
            <Text style={styles.statLabel}>ascent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {completed.length} / {walkStages.length}
            </Text>
            <Text style={styles.statLabel}>days done</Text>
          </View>
        </View>

        {/* Tomorrow / journey complete */}
        <View style={styles.content}>
          {journeyDone ? (
            <View style={styles.doneCard}>
              <Text style={styles.doneEmoji}>🎉</Text>
              <Text style={styles.doneTitle}>Journey complete</Text>
              <Text style={styles.doneBody}>
                You've finished every day of this journey. It stays in your journeys.
              </Text>
            </View>
          ) : (
            <View style={styles.tomorrowCard}>
              <Text style={styles.cardEyebrow}>TOMORROW</Text>
              <Text style={styles.tomorrowTitle}>
                Day {nextDayNum} · {nextLabel}
              </Text>
              {nextStage && (
                <Text style={styles.tomorrowMeta}>
                  {formatKm(nextStage.distanceM)} · ↑{formatElevationM(nextStage.ascentM)}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + layout.ctaBarPadding }]}>
        {journeyDone ? (
          <Button label="View journey" onPress={() => router.replace(`/journey/${id}`)} />
        ) : (
          <Button
            label="Continue"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace(`/journey/active/${id}`)
            }
          />
        )}
      </View>

      {/* Back */}
      <View style={[styles.backWrap, { top: insets.top + 8 }]}>
        <Icon name="check" size={18} color={colors.text.onAccent} />
      </View>
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
    paddingVertical: spacing[8],
    paddingHorizontal: layout.screenPadding,
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing[1] },
  statValue: { ...type.statValue, color: colors.text.primary },
  statLabel: { ...type.meta, color: colors.text.secondary },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border.default },

  content: { padding: layout.screenPadding, gap: spacing[6] },
  cardEyebrow: { ...type.label, color: colors.text.secondary },
  tomorrowCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[6],
    gap: spacing[2],
  },
  tomorrowTitle: { ...type.cardTitle, color: colors.text.primary },
  tomorrowMeta: { ...type.meta, color: colors.text.secondary },

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
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
});
