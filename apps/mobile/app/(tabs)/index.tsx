import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TrailCard } from '../../components/trail';
import { NavBar, SearchField, SectionHeader } from '../../components/ui';
import { useTrails } from '../../lib/hooks';
import { colors, radius, spacing, type } from '../../theme';

export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading } = useTrails();
  const trails = data?.data ?? [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
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

      <SectionHeader title="My journeys" />
      <View style={styles.emptyJourneys}>
        <Text style={styles.emptyText}>No active journeys</Text>
      </View>
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
});
