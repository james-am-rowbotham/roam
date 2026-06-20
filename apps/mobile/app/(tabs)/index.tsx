import type { ObjectiveSummary } from '@roam/content';
import { type Href, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiscoveryCard } from '../../components/browse/DiscoveryCard';
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

// Dev-only launchers that have no real Home entry yet (discovery is Phase 7).
const DEV_LINKS: { label: string; href: Href }[] = [
  {
    label: 'Discover — Europe (Continent → … → Stage)',
    href: { pathname: '/discover/continent/[id]', params: { id: 'europe' } },
  },
  {
    label: 'Pyrenees — explore by range (GR11 + GR10 + Aneto)',
    href: { pathname: '/discover/range/[id]', params: { id: 'pyrenees' } },
  },
  { label: 'ContentBlocks — every kind', href: '/dev/content-blocks' },
];

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
      <View style={styles.trailList}>
        {isLoading
          ? (['a', 'b', 'c'] as const).map((k) => <View key={k} style={styles.skeleton} />)
          : (objectives ?? []).map((o) => (
              <DiscoveryCard
                key={o.id}
                title={o.name}
                subtitle={objectiveSubtitle(o)}
                mediaUri={mediaFor(o.heroMediaId)?.uri}
                onPress={() => router.push({ pathname: '/objective/[id]', params: { id: o.id } })}
              />
            ))}
      </View>

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
  trailList: { marginHorizontal: spacing[8], gap: spacing[6] },
  devLinks: {
    marginHorizontal: spacing[8],
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  devLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[6],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  devLinkLabel: { ...type.body, color: colors.text.primary },
  devLinkChevron: { ...type.bodyLarge, color: colors.text.secondary },
  skeleton: {
    height: 100,
    borderRadius: radius.xl,
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
