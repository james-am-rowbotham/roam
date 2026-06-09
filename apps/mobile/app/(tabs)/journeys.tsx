import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JourneyCard } from '../../components/journey';
import { Button, Icon, SectionHeader } from '../../components/ui';
import { CURRENT_USER_ID } from '../../config/user';
import { useJourneys, useTrails } from '../../lib/hooks';
import { useJourneySetupStore } from '../../store/journeySetupStore';
import { colors, layout, radius, spacing, type } from '../../theme';

export default function JourneysScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: journeysData, isLoading } = useJourneys({ userId: CURRENT_USER_ID });
  const { data: trailsData } = useTrails();

  const journeys = journeysData?.data ?? [];
  const trails = trailsData?.data ?? [];
  const firstTrail = trails[0];

  // + launches the Journey Setup flow for the first trail.
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

  const inProgress = journeys.filter((j) => j.status === 'planned' || j.status === 'active');
  const completed = journeys.filter((j) => j.status === 'completed' || j.status === 'abandoned');
  const isEmpty = !isLoading && journeys.length === 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing[6],
          paddingBottom: layout.contentPaddingBottom + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>My journeys</Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={startNewJourney}
            activeOpacity={0.85}
            disabled={!firstTrail}
          >
            <Icon name="plus" size={18} color={colors.text.onAccent} />
          </TouchableOpacity>
        </View>

        {isEmpty && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No journeys yet. Plan your days, refuges and pace along a trail.
            </Text>
            <Button label="Plan a journey" onPress={startNewJourney} />
          </View>
        )}

        {inProgress.length > 0 && (
          <>
            <SectionHeader title="In progress" />
            {inProgress.map((j) => (
              <JourneyCard
                key={j.id}
                journey={j}
                trailName={trailName(j.routeId)}
                onPress={() => router.push(`/journey/${j.id}`)}
              />
            ))}
          </>
        )}

        {completed.length > 0 && (
          <>
            <SectionHeader title="Completed" />
            {completed.map((j) => (
              <JourneyCard
                key={j.id}
                journey={j}
                trailName={trailName(j.routeId)}
                onPress={() => router.push(`/journey/${j.id}`)}
              />
            ))}
          </>
        )}
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
    paddingBottom: spacing[2],
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
  empty: {
    marginHorizontal: layout.screenPadding,
    marginTop: spacing[6],
    padding: spacing[6],
    gap: spacing[4],
    backgroundColor: colors.bg.subtle,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  emptyText: { ...type.body, color: colors.text.secondary, textAlign: 'center' },
});
