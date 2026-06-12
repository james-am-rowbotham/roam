import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SetupFooter, SetupScaffold } from '../../../components/journey';
import { OptionCard, Segmented } from '../../../components/ui';
import { useTrailSections } from '../../../lib/hooks';
import { PACE_TARGET_M, type Pace, useJourneySetupStore } from '../../../store/journeySetupStore';
import { colors, spacing, type } from '../../../theme';

const PACE_INFO: Record<Pace, { label: string; perDay: string; note: string }> = {
  relaxed: { label: 'Relaxed', perDay: '~15–18 km/day', note: 'extra rest days' },
  moderate: { label: 'Moderate', perDay: '~20–22 km/day', note: 'standard GR11' },
  fast: { label: 'Fast', perDay: '~28–32 km/day', note: 'experienced hikers' },
};

const ORDER: Pace[] = ['relaxed', 'moderate', 'fast'];

export default function PaceStep() {
  const router = useRouter();
  const { trailId, startSectionId, endSectionId, pace, patch } = useJourneySetupStore();

  const { data } = useTrailSections(String(trailId ?? 0), { query: { enabled: !!trailId } });
  const sections = Array.isArray(data?.data) ? data.data : [];

  // Distance of the selected range — used to estimate days per pace.
  const ordered = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const si = startSectionId ? ordered.findIndex((s) => s.id === startSectionId) : 0;
  const ei = endSectionId ? ordered.findIndex((s) => s.id === endSectionId) : ordered.length - 1;
  const lo = Math.min(si < 0 ? 0 : si, ei < 0 ? ordered.length - 1 : ei);
  const hi = Math.max(si < 0 ? 0 : si, ei < 0 ? ordered.length - 1 : ei);
  const rangeM = ordered
    .slice(lo, hi + 1)
    .reduce((a, s) => a + Math.abs(s.endChainageM - s.startChainageM), 0);

  const daysFor = (p: Pace) =>
    rangeM > 0 ? Math.max(1, Math.round(rangeM / PACE_TARGET_M[p])) : 0;

  return (
    <SetupScaffold
      step={3}
      onClose={() => router.back()}
      onBack={() => router.back()}
      footer={
        <SetupFooter
          onBack={() => router.back()}
          onContinue={() => router.push('/journey/setup/guide')}
        />
      }
    >
      <Text style={styles.eyebrow}>Step 3 of 5</Text>
      <Text style={styles.heading}>Pace</Text>

      <View style={styles.segWrap}>
        <Segmented
          value={pace}
          onChange={(v) => patch({ pace: v })}
          options={ORDER.map((p) => ({ value: p, label: PACE_INFO[p].label }))}
        />
      </View>

      <View style={styles.cards}>
        {ORDER.map((p) => {
          const info = PACE_INFO[p];
          const days = daysFor(p);
          return (
            <OptionCard
              key={p}
              title={info.label}
              subtitle={`${info.perDay}${days ? ` · ${days} days` : ''} · ${info.note}`}
              selected={pace === p}
              onPress={() => patch({ pace: p })}
            />
          );
        })}
      </View>

      <Text style={styles.reflowNote}>
        You can adjust any single day on the trail — Roam reflows the plan as you walk.
      </Text>
    </SetupScaffold>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.meta, color: colors.text.secondary, paddingTop: spacing[2] },
  heading: { ...type.sectionHeader, color: colors.text.primary, paddingBottom: spacing[4] },
  segWrap: { paddingBottom: spacing[6] },
  cards: { gap: spacing[3] },
  reflowNote: { ...type.meta, color: colors.text.secondary, paddingTop: spacing[6] },
});
