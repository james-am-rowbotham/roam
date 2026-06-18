import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DiscoveryCard } from '../../../components/browse/DiscoveryCard';
import { DiscoveryScaffold } from '../../../components/browse/DiscoveryScaffold';
import { useContinent, useCountries } from '../../../lib/contentRepo';
import { colors } from '../../../theme';

// Continent landing (§12.3) — hero → summary → COUNTRIES. Country cards carry a
// character/terrain line (no fabricated counts).
export default function ContinentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: continent } = useContinent(id);
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
      listLabel="COUNTRIES"
    >
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
});
