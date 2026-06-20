import type { SearchDoc, SearchType } from '@roam/content';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchResultRow } from '../components/browse/SearchResultRow';
import { Icon, type IconName, NavBar } from '../components/ui';
import { useFocusOnMap } from '../lib/contentFocus';
import { contentStore, mediaFor, runSearch } from '../lib/contentRepo';
import { colors, layout, radius, spacing, type } from '../theme';

// Results group by kind under mono labels (Figma 02 · Search). Order = relevance rank;
// the tag + fallback tile icon come from here. Segments are omitted — the duration filter
// lives on the Map (Figma 03b), not search.
const GROUPS: { type: SearchType; header: string; tag: string; icon: IconName }[] = [
  { type: 'trail', header: 'TRAILS', tag: 'Trail', icon: 'route' },
  { type: 'peak', header: 'PEAKS', tag: 'Peak', icon: 'flag' },
  { type: 'section', header: 'SECTIONS', tag: 'Section', icon: 'route' },
  { type: 'stage', header: 'STAGES', tag: 'Stage', icon: 'route' },
];

// Hero thumbnail for a result — resolved from the summary's heroMediaId.
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
  const { focusTrail, focusSection, focusStage, focusSegment } = useFocusOnMap();
  const [query, setQuery] = useState('');

  const results = useMemo(
    // Idle (no query) → a browse list of trails & peaks, not every stage.
    () => (query.trim() ? runSearch(query, {}) : runSearch('', { types: ['trail', 'peak'] })),
    [query],
  );
  const groups = GROUPS.map((g) => ({
    ...g,
    items: results.filter((r) => r.type === g.type),
  })).filter((g) => g.items.length > 0);

  const open = (doc: SearchDoc) => {
    // Trails, sections, stages and segments highlight on the map first (scope chips + a
    // Start journey CTA). Peaks open their detail (no trail geometry to frame).
    switch (doc.type) {
      case 'trail':
        focusTrail(doc.nav.objectiveId);
        break;
      case 'section':
        if (doc.nav.sectionId) focusSection(doc.nav.objectiveId, doc.nav.sectionId);
        break;
      case 'stage':
        if (doc.nav.stageId) focusStage(doc.nav.objectiveId, doc.nav.stageId);
        break;
      case 'segment':
        if (doc.nav.fromStageId && doc.nav.toStageId) {
          focusSegment(doc.nav.objectiveId, doc.nav.fromStageId, doc.nav.toStageId);
        }
        break;
      case 'peak':
        router.push({ pathname: '/objective/[id]', params: { id: doc.nav.objectiveId } });
        break;
    }
  };

  // The pill's ✕ clears the query, or dismisses search when it's already empty.
  const clearOrDismiss = () => (query ? setQuery('') : router.back());

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <NavBar />

      {/* Search pill — icon · input · clear (Figma 51:108) */}
      <View style={styles.searchWrap}>
        <View style={styles.pill}>
          <Icon name="search" size={18} color={colors.text.secondary} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search trails, peaks and places…"
            placeholderTextColor={colors.text.secondary}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={clearOrDismiss} hitSlop={8} style={styles.clear}>
            <Icon name="close" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {groups.length === 0 ? (
          <Text style={styles.empty}>No matches. Try another word.</Text>
        ) : (
          groups.map((g) => (
            <View key={g.type}>
              <Text style={styles.groupLabel}>{g.header}</Text>
              {g.items.map((doc) => (
                <SearchResultRow
                  key={`${doc.type}:${doc.id}`}
                  title={doc.title}
                  meta={doc.subtitle}
                  tag={g.tag}
                  mediaUri={heroUri(doc)}
                  icon={g.icon}
                  onPress={() => open(doc)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  searchWrap: { paddingHorizontal: spacing[8], paddingVertical: spacing[4] },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.bg.input,
    borderRadius: radius.full,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  input: { flex: 1, ...type.bodyLarge, color: colors.text.primary, padding: 0 },
  clear: { opacity: 0.6 },
  list: { paddingBottom: layout.contentPaddingBottom },
  groupLabel: {
    ...type.label,
    color: colors.text.secondary,
    paddingHorizontal: spacing[8],
    paddingTop: spacing[12],
    paddingBottom: spacing[3],
  },
  empty: {
    ...type.body,
    color: colors.text.secondary,
    paddingHorizontal: spacing[8],
    paddingTop: spacing[12],
  },
});
