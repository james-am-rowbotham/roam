import type { ObjectiveSummary } from '@roam/content';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DiscoveryCard } from '../../../components/browse/DiscoveryCard';
import { DiscoveryScaffold } from '../../../components/browse/DiscoveryScaffold';
import { mediaFor, useRange, useRangeObjectives } from '../../../lib/contentRepo';
import { colors } from '../../../theme';

// Whole-objective subtitle (type + its lead number) — a range lists the full trails/peaks,
// not a section-in-region, so use the objective's own headline stat.
function objectiveSubtitle(o: ObjectiveSummary): string {
  const kind = o.type.charAt(0).toUpperCase() + o.type.slice(1);
  const lead = o.atAGlance[0];
  if (!lead) return kind;
  const value = typeof lead.value === 'number' ? lead.value.toLocaleString('en-US') : lead.value;
  return `${kind} · ${value}${lead.unit ? ` ${lead.unit}` : ''}`;
}

// Range landing — the cross-country geographic axis: aggregates EVERY objective whose
// rangeId is this range (the Pyrenees gather GR11, GR10 and the peaks). Tapping enters the
// objective Guide.
export default function RangeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: range } = useRange(id);
  const { data: objectives } = useRangeObjectives(id);

  if (!range) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <DiscoveryScaffold
      name={range.name}
      tagline={range.tagline}
      summary={range.summary}
      listLabel="TRAILS & PEAKS"
    >
      {objectives?.map((o) => (
        <DiscoveryCard
          key={o.id}
          title={o.name}
          subtitle={objectiveSubtitle(o)}
          mediaUri={mediaFor(o.heroMediaId)?.uri}
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
