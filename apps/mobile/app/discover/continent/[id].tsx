import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { DiscoveryCard } from '../../../components/browse/DiscoveryCard';
import { DiscoveryScaffold } from '../../../components/browse/DiscoveryScaffold';
import { useContinent, useCountries, useRanges } from '../../../lib/contentRepo';
import { colors, spacing, type } from '../../../theme';

// Continent landing (§12.3) — hero → summary → MOUNTAIN RANGES (the geographic axis, the
// headline way to browse) then COUNTRIES (the political axis). A range cross-cuts countries
// (the Pyrenees gather Spain's GR11 + France's GR10), so it leads.
export default function ContinentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: continent } = useContinent(id);
  const { data: ranges } = useRanges(id);
  const { data: countries } = useCountries(id);

  if (!continent) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <DiscoveryScaffold
      name={continent.name}
      tagline={continent.tagline}
      summary={continent.summary}
      listLabel="MOUNTAIN RANGES"
    >
      {ranges?.map((r) => (
        <DiscoveryCard
          key={r.id}
          title={r.name}
          subtitle={r.tagline}
          onPress={() => router.push({ pathname: '/discover/range/[id]', params: { id: r.id } })}
        />
      ))}

      <Text style={styles.subLabel}>COUNTRIES</Text>
      {countries?.map((c) => (
        <DiscoveryCard
          key={c.id}
          title={c.name}
          subtitle={c.tagline}
          onPress={() => router.push({ pathname: '/discover/country/[id]', params: { id: c.id } })}
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
  subLabel: { ...type.label, color: colors.text.secondary, paddingTop: spacing[4] },
});
