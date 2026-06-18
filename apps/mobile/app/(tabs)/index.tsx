import { type Href, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JourneyCard } from '../../components/journey';
import { TrailCard } from '../../components/trail';
import { Button, NavBar, SearchField, SectionHeader } from '../../components/ui';
import { CURRENT_USER_ID } from '../../config/user';
import { useJourneys, useTrails } from '../../lib/hooks';
import { colors, radius, spacing, type } from '../../theme';

const DEV_LINKS: { label: string; href: Href }[] = [
  {
    label: 'Discover — Europe (Continent → … → Stage)',
    href: { pathname: '/discover/continent/[id]', params: { id: 'europe' } },
  },
  { label: 'ContentBlocks — every kind', href: '/dev/content-blocks' },
  {
    label: 'GR11 — trail Guide shell',
    href: { pathname: '/objective/[id]', params: { id: 'gr11' } },
  },
  {
    label: 'GR11 · Ordesa section — generated overview',
    href: {
      pathname: '/objective/[id]/section/[sectionId]',
      params: { id: 'gr11', sectionId: 'gr11-ordesa-high-country' },
    },
  },
  {
    label: 'GR11 · Stage 16 — generated overview prose',
    href: {
      pathname: '/objective/[id]/stage/[stageId]',
      params: { id: 'gr11', stageId: 'gr11-s16' },
    },
  },
  {
    label: 'Aneto — peak Guide shell',
    href: { pathname: '/objective/[id]', params: { id: 'aneto' } },
  },
];

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

      {/* TODO(dev): temporary launcher for the new browsing build (Phases 3–4).
          Remove once Discovery (Phase 7) is the real entry point. */}
      <SectionHeader title="New build" />
      <View style={styles.devLinks}>
        {DEV_LINKS.map((l) => (
          <TouchableOpacity
            key={l.label}
            style={styles.devLink}
            onPress={() => router.push(l.href)}
            activeOpacity={0.7}
          >
            <Text style={styles.devLinkLabel}>{l.label}</Text>
            <Text style={styles.devLinkChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

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
