import type { DurationDays, SearchDoc, SearchFilters, SearchType } from '@roam/content';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaceRow } from '../components/browse/PlaceRow';
import { Chip } from '../components/ui/Chip';
import { Icon } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { contentStore, mediaFor, runSearch } from '../lib/contentRepo';
import { colors, layout, radius, spacing, type } from '../theme';

// Duration presets — "days of walking" (§14). A stage ≈ a day (§11); the band drives both
// the facet-overlap match and segment synthesis (a 2–3 day chunk that isn't a curated Section).
const DURATIONS: { label: string; band: DurationDays }[] = [
  { label: 'Day hike', band: { min: 1, max: 1 } },
  { label: '2–3 days', band: { min: 2, max: 3 } },
  { label: '4–7 days', band: { min: 4, max: 7 } },
  { label: '1–2 weeks', band: { min: 8, max: 14 } },
  { label: 'Long haul', band: { min: 15, max: 99 } },
];

const TYPE_LABEL: Record<SearchType, string> = {
  trail: 'Trail',
  peak: 'Peak',
  section: 'Section',
  segment: 'Segment',
  stage: 'Stage',
};

// Hero thumbnail for a result — resolved from the summary's heroMediaId (segments have none).
function heroUri(doc: SearchDoc): string | undefined {
  const id =
    doc.type === 'section'
      ? contentStore.sectionSummaries.get(doc.id)?.heroMediaId
      : doc.type === 'stage'
        ? contentStore.stageSummaries.get(doc.id)?.heroMediaId
        : doc.type === 'trail' || doc.type === 'peak'
          ? contentStore.objectiveSummaries.get(doc.id)?.heroMediaId
          : undefined;
  return mediaFor(id)?.uri;
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [duration, setDuration] = useState<DurationDays | null>(null);

  const results = useMemo(() => {
    const filters: SearchFilters = duration ? { durationDays: duration } : {};
    // Idle (no query, no filter) → a browse list of trails & peaks, not every stage.
    if (!query.trim() && !duration) return runSearch('', { types: ['trail', 'peak'] });
    return runSearch(query, filters);
  }, [query, duration]);

  const open = (doc: SearchDoc) => {
    switch (doc.type) {
      case 'trail':
      case 'peak':
      case 'segment': // discovery → start planning at the trail (preset picker is a later wire-up)
        router.push({ pathname: '/objective/[id]', params: { id: doc.nav.objectiveId } });
        break;
      case 'section':
        router.push({
          pathname: '/objective/[id]/section/[sectionId]',
          params: { id: doc.nav.objectiveId, sectionId: doc.nav.sectionId ?? '' },
        });
        break;
      case 'stage':
        router.push({
          pathname: '/objective/[id]/stage/[stageId]',
          params: { id: doc.nav.objectiveId, stageId: doc.nav.stageId ?? '' },
        });
        break;
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* search bar: back + live text input */}
      <View style={styles.searchRow}>
        <IconButton icon="arrow-left" style="subtle" onPress={() => router.back()} />
        <View style={styles.field}>
          <Icon name="search" size={18} color={colors.text.secondary} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search trails, sections, stages…"
            placeholderTextColor={colors.text.secondary}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* duration filter — single-select, tap again to clear */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {DURATIONS.map((d) => {
          const active = duration?.min === d.band.min && duration?.max === d.band.max;
          return (
            <Chip
              key={d.label}
              label={d.label}
              selected={active}
              onPress={() => setDuration(active ? null : d.band)}
            />
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {results.length === 0 ? (
          <Text style={styles.empty}>No matches. Try a different word or duration.</Text>
        ) : (
          results.map((doc) => (
            <PlaceRow
              key={`${doc.type}:${doc.id}`}
              title={doc.title}
              meta={[TYPE_LABEL[doc.type], doc.subtitle].filter(Boolean).join(' · ')}
              mediaUri={heroUri(doc)}
              onPress={() => open(doc)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg.input,
    borderRadius: radius.full,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  input: { flex: 1, ...type.bodyLarge, color: colors.text.primary, padding: 0 },
  chips: { gap: spacing[3], paddingHorizontal: layout.screenPadding, paddingBottom: spacing[6] },
  list: { paddingHorizontal: layout.screenPadding, paddingBottom: layout.contentPaddingBottom },
  empty: { ...type.body, color: colors.text.secondary, paddingTop: spacing[12] },
});
