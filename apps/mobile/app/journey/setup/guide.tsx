import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { EstimateRibbon, SetupFooter, SetupScaffold } from '../../../components/journey';
import { OptionCard, Segmented } from '../../../components/ui';
import { type GuidePreset, useJourneySetupStore } from '../../../store/journeySetupStore';
import { colors, spacing, type } from '../../../theme';

const GUIDE_INFO: Record<GuidePreset, { label: string; blurb: string }> = {
  silent: { label: 'Silent', blurb: 'Navigation only. The Guide is there when you ask.' },
  guided: {
    label: 'Guided',
    blurb: 'Proactive alerts for water, refuges, and hazards. Answers your questions.',
  },
  full: {
    label: 'Full',
    blurb: 'All guided features plus daily summaries, weather briefings, and planning assistance.',
  },
};

const ORDER: GuidePreset[] = ['silent', 'guided', 'full'];

export default function GuideStep() {
  const router = useRouter();
  const { guide, patch } = useJourneySetupStore();

  return (
    <SetupScaffold
      step={4}
      onClose={() => router.back()}
      ribbon={<EstimateRibbon />}
      onBack={() => router.back()}
      footer={
        <SetupFooter
          onBack={() => router.back()}
          onContinue={() => router.push('/journey/setup/review')}
        />
      }
    >
      <Text style={styles.eyebrow}>Step 4 of 5</Text>
      <Text style={styles.heading}>Guide preset</Text>

      <View style={styles.segWrap}>
        <Segmented
          value={guide}
          onChange={(v) => patch({ guide: v })}
          options={ORDER.map((g) => ({ value: g, label: GUIDE_INFO[g].label }))}
        />
      </View>

      <View style={styles.cards}>
        {ORDER.map((g) => (
          <OptionCard
            key={g}
            title={GUIDE_INFO[g].label}
            subtitle={GUIDE_INFO[g].blurb}
            selected={guide === g}
            onPress={() => patch({ guide: g })}
          />
        ))}
      </View>
    </SetupScaffold>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.meta, color: colors.text.secondary, paddingTop: spacing[2] },
  heading: { ...type.sectionHeader, color: colors.text.primary, paddingBottom: spacing[4] },
  segWrap: { paddingBottom: spacing[6] },
  cards: { gap: spacing[3] },
});
