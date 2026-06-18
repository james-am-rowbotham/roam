import {
  type GuideFacet,
  type Objective,
  facetLabel,
  guideFacets,
  objectiveTabs,
  topicsForFacet,
} from '@roam/content';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, spacing, type } from '../../theme';
import { ContentBlockRenderer, storeResolve } from '../content';
import { IconButton } from '../ui/IconButton';
import { SegmentedControl } from '../ui/SegmentedControl';
import { StatPills } from '../ui/StatPills';
import { Tabs } from '../ui/Tabs';

// Objective Guide shell (Implementation Pass §6.3) — ONE header for trail and peak,
// parameterised by data alone:
//   [ hero + stat pills ] · [ underline tabs: Guide | Route(s) ] · [ persistent summary ]
//   · [ pill segmented facets ] (Guide only) · [ content ]
// The summary line between the two tab rows is load-bearing layout — it stops the rows
// reading as one heavy double-tab stack (do not butt the segmented under the tabs).
export function ObjectiveGuide({ objective }: { objective: Objective }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabs = objectiveTabs(objective);
  const facets = guideFacets(objective.guide);
  const [facet, setFacet] = useState<GuideFacet>(facets[0] ?? 'overview');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* hero — placeholder media (§11), dark plate so overlay text reads */}
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>{objective.type.toUpperCase()}</Text>
        <Text style={styles.heroTitle}>{objective.name}</Text>
        <Text style={styles.heroTagline}>{objective.tagline}</Text>
      </View>
      <View style={[styles.back, { top: insets.top + spacing[2] }]}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
      </View>

      <View style={styles.statBar}>
        <StatPills stats={objective.atAGlance} />
      </View>

      {/* underline tabs NAVIGATE (§6.2): tapping Route(s) goes to the route view. */}
      <Tabs
        tabs={tabs}
        value="guide"
        onChange={(v) => {
          if (v === 'route') {
            router.push({ pathname: '/objective/[id]/route', params: { id: objective.id } });
          }
        }}
      />

      {/* persistent summary — stays across facets, between the two tab rows */}
      <Text style={styles.summary}>{objective.summary}</Text>

      <View style={styles.guide}>
        {facets.length > 1 && (
          <SegmentedControl
            options={facets.map((f) => ({ value: f, label: facetLabel(f) }))}
            value={facet}
            onChange={setFacet}
          />
        )}
        {topicsForFacet(objective.guide, facet).map((topic) => (
          <View key={topic.key} style={styles.topic}>
            <Text style={styles.topicHeading}>{topic.heading}</Text>
            {topic.body ? <Text style={styles.topicBody}>{topic.body}</Text> : null}
            {topic.blocks ? (
              <ContentBlockRenderer blocks={topic.blocks} resolve={storeResolve} />
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  content: { paddingBottom: layout.contentPaddingBottom },
  back: { position: 'absolute', left: layout.screenPadding, zIndex: 1 },
  hero: {
    height: 280,
    backgroundColor: colors.text.primary,
    padding: layout.screenPadding,
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  heroKicker: { ...type.label, color: colors.overlay.onImageMuted },
  heroTitle: {
    fontFamily: type.title.fontFamily,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: colors.overlay.onImage,
  },
  heroTagline: { ...type.body, color: colors.overlay.onImageMuted },
  statBar: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  summary: {
    ...type.body,
    color: colors.text.secondary,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[8],
    paddingBottom: spacing[6],
  },
  guide: { paddingHorizontal: layout.screenPadding, gap: spacing[8] },
  topic: { gap: spacing[3] },
  topicHeading: { ...type.sectionHeader, color: colors.text.primary },
  topicBody: { ...type.body, color: colors.text.primary },
});
