import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JourneyCard } from '../../components/journey';
import { TrailCard } from '../../components/trail';
import { Button, NavBar, SearchField, SectionHeader } from '../../components/ui';
import { CURRENT_USER_ID } from '../../config/user';
import { useJourneys, useTrails } from '../../lib/hooks';
import { colors, radius, spacing, type } from '../../theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useTrails();
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
      <SearchField />

      <SectionHeader title="Popular trails" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {isLoading
          ? (['a', 'b', 'c'] as const).map((k) => <View key={k} style={styles.skeleton} />)
          : trails.map((trail) => (
              <TrailCard
                key={trail.id}
                trail={trail}
                onPress={() => router.push(`/trail/${trail.id}`)}
              />
            ))}
      </ScrollView>

      <SectionHeader title="Active journey" />
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
  carousel: { paddingHorizontal: spacing[8], gap: spacing[4] },
  skeleton: {
    width: 150,
    height: 213,
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
