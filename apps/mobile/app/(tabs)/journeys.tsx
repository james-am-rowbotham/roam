import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JourneyCard } from '../../components/journey';
import { Button, Icon, RoamMark } from '../../components/ui';
import { CURRENT_USER_ID } from '../../config/user';
import { useJourneys, useTrails } from '../../lib/hooks';
import { useJourneySetupStore } from '../../store/journeySetupStore';
import { colors, layout, radius, spacing, type } from '../../theme';

type JourneyTab = 'active' | 'planned' | 'completed';
const TABS: { value: JourneyTab; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Completed' },
];

export default function JourneysScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<JourneyTab>('active');

  const { data: journeysData, isLoading } = useJourneys({ userId: CURRENT_USER_ID });
  const { data: trailsData } = useTrails();

  const journeys = journeysData?.data ?? [];
  const trails = trailsData?.data ?? [];
  const firstTrail = trails[0];

  const initSetup = useJourneySetupStore((s) => s.init);
  const startNewJourney = () => {
    if (!firstTrail) return;
    initSetup({
      routeId: firstTrail.routeId,
      trailId: firstTrail.id,
      trailRef: firstTrail.ref ?? firstTrail.name,
    });
    router.push('/journey/setup/scope');
  };

  const trailName = (routeId: number): string => {
    const t = trails.find((x) => x.routeId === routeId);
    return t?.ref ?? t?.name ?? 'Journey';
  };
  const trailElevation = (routeId: number): number[] =>
    trails.find((x) => x.routeId === routeId)?.elevation ?? [];

  // Active = in-progress (the one being navigated + any paused). Planned = never
  // started. Completed = finished or abandoned.
  const byTab: Record<JourneyTab, typeof journeys> = {
    active: journeys.filter((j) => j.status === 'active' || j.status === 'paused'),
    planned: journeys.filter((j) => j.status === 'planned'),
    completed: journeys.filter((j) => j.status === 'completed' || j.status === 'abandoned'),
  };
  const list = byTab[tab];
  const sortedList = list.sort((a, b) => {
    // active to the top, then by most recently updated.
    const aActive = a.status === 'active' ? 1 : 0;
    const bActive = b.status === 'active' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const isEmpty = !isLoading && list.length === 0;

  const emptyText: Record<JourneyTab, string> = {
    active: 'No journeys in progress. Plan your days, refuges and pace along a trail.',
    planned: 'No planned journeys yet. Plan one and start it when you’re ready.',
    completed: 'No completed journeys yet.',
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Text style={styles.title}>My journeys</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={startNewJourney}
          activeOpacity={0.85}
          disabled={!firstTrail}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="plus" size={18} color={colors.text.onAccent} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={styles.tab}
            onPress={() => setTab(t.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, tab === t.value && styles.tabLabelActive]}>
              {t.label}
            </Text>
            {tab === t.value && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing[6],
          paddingBottom: layout.contentPaddingBottom + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty && (
          <View style={styles.empty}>
            <RoamMark width={34} />
            <Text style={styles.emptyTitle}>No journeys yet</Text>
            <Text style={styles.emptyText}>{emptyText[tab]}</Text>
            {tab !== 'completed' && (
              <Button label="Find a trail" onPress={() => router.push('/(tabs)')} />
            )}
          </View>
        )}

        {sortedList.map((j) => (
          <JourneyCard
            key={j.id}
            journey={j}
            trailName={trailName(j.routeId)}
            elevation={trailElevation(j.routeId)}
            onOpen={() => router.push(`/journey/${j.id}`)}
            onMap={() => router.push(`/journey/active/${j.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing[4],
  },
  title: { ...type.sectionHeader, color: colors.text.primary },
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabs: {
    flexDirection: 'row',
    paddingLeft: spacing[6],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  tab: { paddingHorizontal: spacing[4], paddingTop: spacing[2], gap: 7, alignItems: 'center' },
  tabLabel: { ...type.detailTab, color: colors.text.secondary },
  tabLabelActive: { color: colors.text.primary },
  tabUnderline: { height: 1.5, width: '100%', backgroundColor: colors.accent },

  empty: {
    marginHorizontal: layout.screenPadding,
    marginTop: spacing[6],
    padding: spacing[6],
    gap: spacing[4],
    backgroundColor: colors.bg.subtle,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  emptyTitle: { ...type.cardTitle, color: colors.text.primary },
  emptyText: { ...type.body, color: colors.text.secondary, textAlign: 'center' },
});
