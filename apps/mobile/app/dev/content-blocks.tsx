import type { ContentBlock } from '@roam/content';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type BlockResolve, ContentBlockRenderer } from '../../components/content';
import { GradeBadge } from '../../components/ui/GradeBadge';
import { IconButton } from '../../components/ui/IconButton';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { StatPills } from '../../components/ui/StatPills';
import { Tabs } from '../../components/ui/Tabs';
import { colors, layout, type } from '../../theme';

// Phase 3 fixture (Implementation Pass §10) — renders a ContentBlock[] covering every
// `kind`, plus the underline Tabs vs pill Segmented (visually distinct) and the
// grade-from-system badge. Not a product screen: the gate for the renderer + design
// system. Run on device to eyeball parity; tokens drive all colour (no raw hex here).

const FIXTURE: ContentBlock[] = [
  {
    kind: 'prose',
    heading: 'Overview',
    body: 'Physically demanding rather than technically hard — two passes, a long descent.',
  },
  {
    kind: 'map',
    geojson: { type: 'FeatureCollection', features: [] },
    styleId: 'outdoor',
    markers: [],
  },
  {
    kind: 'elevation',
    points: [
      { distanceKm: 0, elevM: 1530 },
      { distanceKm: 2, elevM: 1680 },
      { distanceKm: 4, elevM: 1880 },
      { distanceKm: 6, elevM: 2120 },
      { distanceKm: 8, elevM: 2360 },
      { distanceKm: 9, elevM: 2560 },
      { distanceKm: 11, elevM: 2410 },
      { distanceKm: 13, elevM: 2180 },
      { distanceKm: 15, elevM: 2000 },
      { distanceKm: 17, elevM: 1820 },
      { distanceKm: 19, elevM: 1900 },
      { distanceKm: 21, elevM: 1700 },
      { distanceKm: 23, elevM: 1480 },
      { distanceKm: 24, elevM: 1290 },
    ],
  },
  { kind: 'water', stops: [{ locationId: 'respomuso', distanceKm: 14, note: 'refuge tap' }] },
  { kind: 'accommodation', places: [{ locationId: 'respomuso', note: 'staffed Jun–Sep' }] },
  {
    kind: 'navigation',
    body: 'Cairned above the treeline; the GR11 blazes thin out on the cols.',
    marking: 'gr',
  },
  {
    kind: 'hazards',
    callouts: [
      { tone: 'warn', body: 'Snow lingers on the north side of the higher col into early July.' },
      { tone: 'danger', body: 'No water for 12 km after the second pass.' },
    ],
  },
  {
    kind: 'whatYouSee',
    kicker: 'geology',
    title: 'Why the Ordesa walls stand vertical',
    body: 'Hard limestone over soft marl — the cliff calves away clean.',
    source: 'IGME',
  },
  { kind: 'highlights', header: "Don't miss", highlightIds: ['h1', 'h2'] },
  { kind: 'chips', group: 'gear', items: ['Microspikes', 'Ice axe', '2L water'] },
  { kind: 'itinerary', legIds: ['leg-1', 'leg-2'] },
  { kind: 'gallery', mediaIds: ['m1', 'm2', 'm3'] },
];

const resolve: BlockResolve = {
  location: (id) => ({
    id,
    slug: id,
    name: 'Refugio de Respomuso',
    type: 'refugio',
    coords: { lat: 42.83, lng: -0.29 },
  }),
  highlight: (id) => ({ id, title: id === 'h1' ? 'The Respomuso lake basin' : 'Monte Perdido' }),
  leg: (id) => ({
    id,
    routeId: 'r',
    number: id === 'leg-1' ? 1 : 2,
    name: id === 'leg-1' ? 'Approach to the refuge' : 'Summit push',
    atAGlance: [],
  }),
  mediaUrl: () => undefined, // placeholders (§11 — no real photography this pass)
};

export default function ContentBlocksFixture() {
  const router = useRouter();
  const [tab, setTab] = useState<'guide' | 'route'>('guide');
  const [facet, setFacet] = useState<'overview' | 'planning' | 'environment'>('overview');
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
        </View>
        <Text style={styles.h1}>Stat pills</Text>
        <StatPills
          stats={[
            { key: 'distance', value: 24, unit: 'km', label: 'Distance' },
            { key: 'ascent', value: 1120, unit: 'm', label: 'Ascent' },
            { key: 'time', value: '8h 30m', label: 'Time' },
            { key: 'grade', value: 'Hard', label: 'Grade' },
          ]}
        />

        <Text style={styles.h1}>Underline tabs (navigate)</Text>
        <Tabs
          tabs={[
            { value: 'guide', label: 'Guide' },
            { value: 'route', label: 'Route' },
          ]}
          value={tab}
          onChange={setTab}
        />

        <Text style={styles.h1}>Segmented control (swap facet)</Text>
        <SegmentedControl
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'planning', label: 'Planning' },
            { value: 'environment', label: 'Environment' },
          ]}
          value={facet}
          onChange={setFacet}
        />

        <Text style={styles.h1}>Grade badges (peak routes lead with these)</Text>
        <View style={styles.gradeRow}>
          <GradeBadge grade={{ system: 'french-alpine', value: 'F' }} />
          <GradeBadge grade={{ system: 'french-alpine', value: 'PD' }} />
          <GradeBadge grade={{ system: 'french-alpine', value: 'AD' }} />
          <GradeBadge grade={{ system: 'french-alpine', value: 'F+' }} />
        </View>

        <Text style={styles.h1}>ContentBlock — every kind</Text>
        <ContentBlockRenderer blocks={FIXTURE} resolve={resolve} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  content: { padding: layout.screenPadding, gap: 16, paddingBottom: 64 },
  header: { flexDirection: 'row' },
  h1: { ...type.sectionHeader, color: colors.text.primary, marginTop: 12 },
  gradeRow: { flexDirection: 'row', gap: 12 },
});
