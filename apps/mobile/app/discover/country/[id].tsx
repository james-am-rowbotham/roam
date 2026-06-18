import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DiscoveryCard } from '../../../components/browse/DiscoveryCard';
import { DiscoveryScaffold } from '../../../components/browse/DiscoveryScaffold';
import { useCountry, useRegions } from '../../../lib/contentRepo';
import { colors } from '../../../theme';

// Country landing (§12.3) — hero → summary → REGIONS. Region cards carry a character
// line; objective name-dropping is demoted.
export default function CountryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: country } = useCountry(id);
  const { data: regions } = useRegions(id);

  if (!country) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <DiscoveryScaffold
      name={country.name}
      tagline={country.tagline}
      summary={country.summary}
      listLabel="REGIONS"
    >
      {regions?.map((r) => (
        <DiscoveryCard
          key={r.id}
          title={r.name}
          subtitle={r.tagline}
          onPress={() => router.push({ pathname: '/discover/region/[id]', params: { id: r.id } })}
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
