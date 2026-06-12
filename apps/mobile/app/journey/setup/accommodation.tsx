import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { EstimateRibbon, SetupFooter, SetupScaffold } from '../../../components/journey';
import { Icon, Segmented } from '../../../components/ui';
import { useTrailAccommodations } from '../../../lib/hooks';
import { type Accommodation, useJourneySetupStore } from '../../../store/journeySetupStore';
import { colors, radius, spacing, type } from '../../../theme';

const COPY: Record<Accommodation, { label: string; blurb: string }> = {
  camping: {
    label: 'Camping',
    blurb:
      'Your itinerary favours campsites and wild camping. You carry a tent and are self-sufficient; refuges are a fallback.',
  },
  refuge: {
    label: 'Refuges',
    blurb:
      'Your itinerary is built around mountain huts and staffed refuges. Meals usually provided. Advance booking recommended in summer.',
  },
  mixed: {
    label: 'Mixed',
    blurb: 'A blend — refuges where they fall handily, camping on the longer gaps between them.',
  },
};

export default function AccommodationStep() {
  const router = useRouter();
  const { trailId, accommodation, patch } = useJourneySetupStore();

  const { data } = useTrailAccommodations(String(trailId ?? 0), { query: { enabled: !!trailId } });
  const count = Array.isArray(data?.data) ? data.data.length : 0;

  const copy = COPY[accommodation];

  return (
    <SetupScaffold
      step={2}
      onClose={() => router.back()}
      ribbon={<EstimateRibbon />}
      onBack={() => router.back()}
      footer={
        <SetupFooter
          onBack={() => router.back()}
          onContinue={() => router.push('/journey/setup/pace')}
        />
      }
    >
      <Text style={styles.eyebrow}>Step 2 of 5</Text>
      <Text style={styles.heading}>Accommodation preference</Text>

      <View style={styles.segWrap}>
        <Segmented
          value={accommodation}
          onChange={(v) => patch({ accommodation: v })}
          options={[
            { value: 'camping', label: 'Camping' },
            { value: 'refuge', label: 'Refuges' },
            { value: 'mixed', label: 'Mixed' },
          ]}
        />
      </View>

      <View style={styles.blurbCard}>
        <Text style={styles.blurbTitle}>{copy.label}</Text>
        <Text style={styles.blurbText}>{copy.blurb}</Text>
      </View>

      <Text style={styles.listHeader}>ON THIS ROUTE</Text>
      <View style={styles.summaryRow}>
        <Icon name="home" size={18} color={colors.marker.refuge} />
        <View style={styles.summaryText}>
          <Text style={styles.summaryTitle}>{count} refuges &amp; huts</Text>
          <Text style={styles.summaryBody}>Mapped along the GR11 corridor</Text>
        </View>
      </View>
      <View style={styles.summaryRow}>
        <Icon name="calendar" size={18} color={colors.text.secondary} />
        <View style={styles.summaryText}>
          <Text style={styles.summaryTitle}>Some require booking</Text>
          <Text style={styles.summaryBody}>The Guide will remind you in advance</Text>
        </View>
      </View>
    </SetupScaffold>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.meta, color: colors.text.secondary, paddingTop: spacing[2] },
  heading: { ...type.sectionHeader, color: colors.text.primary, paddingBottom: spacing[4] },
  segWrap: { paddingBottom: spacing[6] },

  blurbCard: {
    backgroundColor: colors.bg.subtle,
    borderRadius: radius.xl,
    padding: spacing[6],
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  blurbTitle: { ...type.cardTitle, color: colors.text.primary },
  blurbText: { ...type.body, color: colors.text.secondary },

  listHeader: { ...type.label, color: colors.text.secondary, paddingBottom: spacing[3] },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing[4],
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  summaryText: { flex: 1, gap: spacing[1] },
  summaryTitle: { ...type.cardTitle, color: colors.text.primary },
  summaryBody: { ...type.meta, color: colors.text.secondary },
});
