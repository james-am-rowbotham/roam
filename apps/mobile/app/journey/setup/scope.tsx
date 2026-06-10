import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SetupFooter, SetupScaffold, StagePicker } from '../../../components/journey';
import { Icon, Segmented } from '../../../components/ui';
import { formatKm, orientRoute, routeEndpoints } from '../../../lib/format';
import { useTrail, useTrailSections } from '../../../lib/hooks';
import { useJourneySetupStore } from '../../../store/journeySetupStore';
import { colors, radius, spacing, type } from '../../../theme';

export default function ScopeStep() {
  const router = useRouter();
  const { trailId, trailRef, scope, direction, startSectionId, endSectionId, name, patch } =
    useJourneySetupStore();

  const idStr = String(trailId ?? 0);
  const { data: trailData } = useTrail(idStr, { query: { enabled: !!trailId } });
  const { data: sectionsData } = useTrailSections(idStr, { query: { enabled: !!trailId } });

  const trail =
    trailData?.data && 'properties' in trailData.data ? trailData.data.properties : null;
  const sections = Array.isArray(sectionsData?.data) ? sectionsData.data : [];

  const [picking, setPicking] = useState<'start' | 'finish' | null>(null);

  // Default the name once the trail is known.
  useEffect(() => {
    if (!name && trailRef) patch({ name: `${trailRef} journey` });
  }, [name, trailRef, patch]);

  // Sections in walking order — reversed when heading east→west — so the pickers
  // and start/finish read in the order you'll actually walk them.
  const orderedAsc = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const walking = direction === 'reverse' ? [...orderedAsc].reverse() : orderedAsc;
  const walkPos = new Map(walking.map((s, i) => [s.id, i]));

  const reverse = direction === 'reverse';
  const startSection = sections.find((s) => s.id === startSectionId) ?? walking[0];
  const endSection = sections.find((s) => s.id === endSectionId) ?? walking[walking.length - 1];
  const startPos = startSection ? (walkPos.get(startSection.id) ?? 0) : 0;
  const endPos = endSection
    ? (walkPos.get(endSection.id) ?? walking.length - 1)
    : walking.length - 1;

  // The journey's two endpoints — the place you set off from and the place you
  // finish at — oriented for the direction (not the section names themselves).
  const journeyFrom = startSection ? routeEndpoints(startSection.name)[reverse ? 1 : 0] : '—';
  const journeyTo = endSection ? routeEndpoints(endSection.name)[reverse ? 0 : 1] : '—';

  // Sections shown in walking order with names oriented for the direction.
  const walkingDisplay = walking.map((s) => ({ ...s, name: orientRoute(s.name, reverse) }));

  // A finish can't come before the start in walking order, and vice versa.
  const startDisabled = walking.filter((s) => (walkPos.get(s.id) ?? 0) > endPos).map((s) => s.id);
  const finishDisabled = walking
    .filter((s) => (walkPos.get(s.id) ?? 0) < startPos)
    .map((s) => s.id);

  // Flipping direction reverses the walk, so the start and finish swap ends too.
  const flipDirection = () =>
    patch({
      direction: direction === 'forward' ? 'reverse' : 'forward',
      startSectionId: endSectionId,
      endSectionId: startSectionId,
    });

  const isSection = scope === 'section';

  return (
    <SetupScaffold
      step={1}
      onClose={() => router.back()}
      footer={
        <SetupFooter
          onContinue={() => router.push('/journey/setup/accommodation')}
          continueDisabled={sections.length === 0}
        />
      }
    >
      <Text style={styles.eyebrow}>Step 1 of 5</Text>
      <Text style={styles.heading}>Select scope</Text>

      <View style={styles.segWrap}>
        <Segmented
          value={scope}
          onChange={(v) => patch({ scope: v })}
          options={[
            { value: 'entire', label: 'Entire trail' },
            { value: 'section', label: 'Specific section' },
          ]}
        />
      </View>

      {/* Trail */}
      <View style={styles.block}>
        <Text style={styles.label}>Trail</Text>
        <Text style={styles.value}>{trailRef}</Text>
        <Text style={styles.meta}>
          {[
            trail?.distanceM ? formatKm(trail.distanceM) : null,
            `${sections.length} sections`,
            trail?.country,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      {/* Direction */}
      <View style={styles.block}>
        <Text style={styles.label}>Direction</Text>
        <View style={styles.directionRow}>
          <Text style={styles.value}>
            {journeyFrom} → {journeyTo}
          </Text>
          <TouchableOpacity style={styles.flipBtn} onPress={flipDirection} activeOpacity={0.8}>
            <Icon name="swap" size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Tap to reverse the direction.</Text>
      </View>

      {/* Section range — only when planning a specific part of the trail */}
      {isSection && (
        <>
          <TouchableOpacity
            style={styles.block}
            onPress={() => setPicking('start')}
            activeOpacity={0.7}
          >
            <Text style={styles.label}>Start from section</Text>
            <View style={styles.directionRow}>
              <Text style={styles.value}>
                {startSection ? orientRoute(startSection.name, reverse) : '—'}
              </Text>
              <Icon name="chevron-down" size={18} color={colors.text.secondary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.block}
            onPress={() => setPicking('finish')}
            activeOpacity={0.7}
          >
            <Text style={styles.label}>Finish at section</Text>
            <View style={styles.directionRow}>
              <Text style={styles.value}>
                {endSection ? orientRoute(endSection.name, reverse) : '—'}
              </Text>
              <Icon name="chevron-down" size={18} color={colors.text.secondary} />
            </View>
          </TouchableOpacity>
        </>
      )}

      {/* Journey name */}
      <View style={styles.block}>
        <Text style={styles.label}>Journey name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(t) => patch({ name: t })}
          placeholder={`${trailRef} journey`}
          placeholderTextColor={colors.text.secondary}
        />
      </View>

      <StagePicker
        visible={picking !== null}
        title={picking === 'start' ? 'Start from section' : 'Finish at section'}
        sections={walkingDisplay}
        selectedId={picking === 'start' ? (startSection?.id ?? null) : (endSection?.id ?? null)}
        disabledIds={picking === 'start' ? startDisabled : finishDisabled}
        onSelect={(id) =>
          patch(picking === 'start' ? { startSectionId: id } : { endSectionId: id })
        }
        onClose={() => setPicking(null)}
      />
    </SetupScaffold>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.meta, color: colors.text.secondary, paddingTop: spacing[2] },
  heading: { ...type.sectionHeader, color: colors.text.primary, paddingBottom: spacing[4] },
  segWrap: { paddingBottom: spacing[4] },

  block: {
    gap: spacing[1],
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  label: { ...type.meta, color: colors.text.secondary },
  value: { ...type.bodyLarge, color: colors.text.primary },
  meta: { ...type.meta, color: colors.text.secondary },
  hint: { ...type.meta, color: colors.text.secondary, paddingTop: spacing[1] },

  directionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flipBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: {
    ...type.bodyLarge,
    color: colors.text.primary,
    paddingVertical: spacing[2],
  },
});
