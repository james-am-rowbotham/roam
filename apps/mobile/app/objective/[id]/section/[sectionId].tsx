import type { PlaceRef, Section, Stat } from '@roam/content';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaceRow } from '../../../../components/browse/PlaceRow';
import { ContentBlockRenderer, storeResolve } from '../../../../components/content';
import { IconButton } from '../../../../components/ui/IconButton';
import { StatPills } from '../../../../components/ui/StatPills';
import { Tabs } from '../../../../components/ui/Tabs';
import { contentStore, useSection, useSectionStages } from '../../../../lib/contentRepo';
import { colors, layout, spacing, type } from '../../../../theme';

// Section-overview topic order (§12.2): Terrain → Flora & fauna → Culture → Weather.
const TOPIC_ORDER = ['terrain', 'flora', 'culture', 'weather'];
const stat = (stats: Stat[], key: string) => stats.find((s) => s.key === key)?.value;
const stageMeta = (stats: Stat[]) =>
  [
    stat(stats, 'distance') != null ? `${stat(stats, 'distance')} km` : null,
    stat(stats, 'ascent') != null ? `+${stat(stats, 'ascent')} m` : null,
    stat(stats, 'time'),
    stat(stats, 'grade'),
  ]
    .filter(Boolean)
    .join(' · ');
const placeNames = (refs: PlaceRef[]) =>
  refs.map((r) => contentStore.locations.get(r.locationId)?.name ?? r.locationId).join(', ');

// Section screen (§6.1) — hero + stat pills + in-place Overview | Stages tabs (both
// share the hero, so this is local tab state, not navigation). Overview follows the
// §12.2 order; Stages lists the etapas, each routing to its Stage.
export default function SectionScreen() {
  const { id, sectionId } = useLocalSearchParams<{ id: string; sectionId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: section } = useSection(sectionId);
  const stages = useSectionStages(sectionId);
  const [tab, setTab] = useState<'overview' | 'stages'>('overview');

  if (!section) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>{`STAGES ${stat(section.atAGlance, 'stages') ?? ''}`}</Text>
        <Text style={styles.heroTitle}>{section.name}</Text>
        <Text style={styles.heroTagline}>{section.tagline}</Text>
      </View>
      <View style={[styles.back, { top: insets.top + spacing[2] }]}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
      </View>

      <View style={styles.statBar}>
        <StatPills stats={section.atAGlance} />
      </View>

      <Tabs
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'stages', label: 'Stages' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'overview' ? (
        <Overview section={section} />
      ) : (
        <View style={styles.body}>
          {stages.data?.map((s) => (
            <PlaceRow
              key={s.id}
              title={s.name}
              meta={`Stage ${s.number} · ${stageMeta(s.atAGlance)}`}
              onPress={() =>
                router.push({
                  pathname: '/objective/[id]/stage/[stageId]',
                  params: { id, stageId: s.id },
                })
              }
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Overview({ section }: { section: Section }) {
  const topics = (section.guide ?? [])
    .slice()
    .sort((a, b) => TOPIC_ORDER.indexOf(a.key) - TOPIC_ORDER.indexOf(b.key));
  return (
    <View style={styles.body}>
      {/* lead paragraph */}
      <Text style={styles.lead}>{section.summary}</Text>

      {/* region map — placeholder until region geometry is in the pack (§7) */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>Region map</Text>
      </View>

      {/* Terrain → Flora & fauna → Culture → Weather */}
      {topics.map((t) => (
        <View key={t.key} style={styles.topic}>
          <Text style={styles.heading}>{t.heading}</Text>
          <Text style={styles.bodyText}>{t.body}</Text>
        </View>
      ))}

      {/* Resupply & refuges digest */}
      <View style={styles.topic}>
        <Text style={styles.heading}>Resupply & refuges</Text>
        {section.resupply.length > 0 && (
          <Text style={styles.bodyText}>Resupply · {placeNames(section.resupply)}</Text>
        )}
        {section.refuges.length > 0 && (
          <Text style={styles.bodyText}>Refuges · {placeNames(section.refuges)}</Text>
        )}
      </View>

      {/* Highlights — near the end (§12.2) */}
      {section.highlightIds.length > 0 && (
        <ContentBlockRenderer
          blocks={[{ kind: 'highlights', highlightIds: section.highlightIds }]}
          resolve={storeResolve}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.app,
  },
  content: { paddingBottom: layout.contentPaddingBottom },
  back: { position: 'absolute', left: layout.screenPadding, zIndex: 1 },
  hero: {
    height: 260,
    backgroundColor: colors.text.primary,
    padding: layout.screenPadding,
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  heroKicker: { ...type.label, color: colors.overlay.onImageMuted },
  heroTitle: {
    fontFamily: type.title.fontFamily,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: colors.overlay.onImage,
  },
  heroTagline: { ...type.body, color: colors.overlay.onImageMuted },
  statBar: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  body: { paddingHorizontal: layout.screenPadding, paddingTop: spacing[8], gap: spacing[8] },
  lead: { ...type.bodyLarge, color: colors.text.primary },
  mapPlaceholder: {
    height: 160,
    borderRadius: 12,
    backgroundColor: colors.map.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { ...type.meta, color: colors.text.secondary },
  topic: { gap: spacing[3] },
  heading: { ...type.sectionHeader, color: colors.text.primary },
  bodyText: { ...type.body, color: colors.text.primary },
});
