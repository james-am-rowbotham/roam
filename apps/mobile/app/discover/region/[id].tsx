import type { ObjectiveSummary } from '@roam/content';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DiscoveryCard } from '../../../components/browse/DiscoveryCard';
import { DiscoveryScaffold } from '../../../components/browse/DiscoveryScaffold';
import { contentStore, useRegion, useRegionObjectives } from '../../../lib/contentRepo';
import { colors } from '../../../theme';

// The §12.3 objective-card rule: type + the single decisive number. A TRAIL surfaces
// its *section in this region* (stages + km), not the whole trail; a PEAK its summit.
function objectiveSubtitle(obj: ObjectiveSummary, regionId: string): string {
  if (obj.type === 'peak') {
    const summit = obj.atAGlance.find((s) => s.key === 'summit');
    return summit ? `Peak · ${summit.value} ${summit.unit ?? ''}`.trim() : 'Peak';
  }
  const section = [...contentStore.sections.values()].find(
    (s) => s.objectiveId === obj.id && s.regionIds.includes(regionId),
  );
  if (!section) return 'Trail';
  const stages = section.atAGlance.find((s) => s.key === 'stages')?.value;
  const dist = section.atAGlance.find((s) => s.key === 'distance')?.value;
  return ['Trail', stages != null ? `Stages ${stages}` : null, dist != null ? `${dist} km` : null]
    .filter(Boolean)
    .join(' · ');
}

// Region landing (§12.3, invariant 3) — aggregates EVERY objective whose regionIds
// include this region. Header reads "TRAILS & PEAKS". Tapping enters the objective Guide.
export default function RegionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: region } = useRegion(id);
  const { data: objectives } = useRegionObjectives(id);

  if (!region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <DiscoveryScaffold
      name={region.name}
      tagline={region.tagline}
      summary={region.summary}
      listLabel="TRAILS & PEAKS"
    >
      {objectives?.map((o) => (
        <DiscoveryCard
          key={o.id}
          title={o.name}
          subtitle={objectiveSubtitle(o, id)}
          onPress={() => router.push({ pathname: '/objective/[id]', params: { id: o.id } })}
        />
      ))}
    </DiscoveryScaffold>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.app,
  },
});
