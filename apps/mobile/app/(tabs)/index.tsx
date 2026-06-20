import type { ObjectiveSummary } from '@roam/content';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TRAIL_CARD_WIDTH, TrailCard } from '../../components/browse/TrailCard';
import { JourneyCard } from '../../components/journey';
import { Button, NavBar, SearchField, SectionHeader } from '../../components/ui';
import { CURRENT_USER_ID } from '../../config/user';
import { mediaFor, useObjectives } from '../../lib/contentRepo';
import { useJourneys, useTrails } from '../../lib/hooks';
import { colors, radius, spacing, type } from '../../theme';

// Card subtitle: "Trail · 820 km" / "Peak · 3,404 m" — type + the lead stat.
const objectiveSubtitle = (o: ObjectiveSummary): string => {
  const kind = o.type.charAt(0).toUpperCase() + o.type.slice(1);
  const lead = o.atAGlance[0];
  if (!lead) return kind;
  const value = typeof lead.value === 'number' ? lead.value.toLocaleString('en-US') : lead.value;
  return `${kind} · ${value}${lead.unit ? ` ${lead.unit}` : ''}`;
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: objectives, isLoading } = useObjectives();
  const { data } = useTrails();
  const trails = data?.data ?? [];

  // Active journey (the navigated one) surface on Home.
  const { data: journeysData } = useJourneys({ userId: CURRENT_USER_ID });
  const journeys = journeysData?.data ?? [];
  const isActiveJourney = journeys.find((j) => j.status === 'active');
  const firstRun = journeysData != null && journeys.length === 0;
  const trailName = (routeId: number): string => {
    const t = trails.find((x) => x.routeId === routeId);
    return t?.ref ?? t?.name ?? 'Journey';
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing[2] }]}
      showsVerticalScrollIndicator={false}
    >
      <NavBar />
      <SearchField onPress={() => router.push('/search')} />

      <SectionHeader title="Popular trails" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={TRAIL_CARD_WIDTH + spacing[2]}
        snapToAlignment="start"
        contentContainerStyle={styles.trailCarousel}
      >
        {isLoading
          ? (['a', 'b', 'c'] as const).map((k) => <View key={k} style={styles.skeleton} />)
          : (objectives ?? []).map((o) => (
              <TrailCard
                key={o.id}
                title={o.name}
                subtitle={objectiveSubtitle(o)}
                mediaUri={mediaFor(o.heroMediaId)?.uri}
                onPress={() => router.push({ pathname: '/objective/[id]', params: { id: o.id } })}
              />
            ))}
      </ScrollView>

      <SectionHeader title="My journeys" />
      {firstRun ? (
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome to Roam</Text>
          <Text style={styles.welcomeBody}>
            Pick a trail, set your pace, and Roam plans the days — then walks them with you, fully
            offline.
          </Text>
          <Button label="Browse trails" size="sm" onPress={() => router.push('/(tabs)/map')} />
        </View>
      ) : isActiveJourney ? (
        <JourneyCard
          key={isActiveJourney.id}
          journey={isActiveJourney}
          trailName={trailName(isActiveJourney.routeId)}
          elevation={trails.find((t) => t.routeId === isActiveJourney.routeId)?.elevation ?? []}
          compact
          onOpen={() => router.push(`/journey/${isActiveJourney.id}`)}
          onMap={() => router.push(`/journey/active/${isActiveJourney.id}`)}
        />
      ) : (
        <View style={styles.emptyJourneys}>
          <Text style={styles.emptyText}>No active journeys</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  content: { paddingBottom: spacing[12] },
  trailCarousel: {
    paddingHorizontal: spacing[8],
    gap: spacing[2],
  },
  skeleton: {
    width: TRAIL_CARD_WIDTH,
    height: 173,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.subtle,
  },
  emptyJourneys: {
    marginHorizontal: spacing[8],
    padding: spacing[6],
    backgroundColor: colors.bg.subtle,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  emptyText: { ...type.body, color: colors.text.secondary },

  welcomeCard: {
    marginHorizontal: spacing[8],
    padding: spacing[8],
    backgroundColor: colors.status.progress.bg,
    borderRadius: radius.lg,
    gap: spacing[4],
    alignItems: 'flex-start',
  },
  welcomeTitle: { ...type.cardTitle, color: colors.status.progress.text },
  welcomeBody: { ...type.meta, color: colors.status.progress.text },
});
