import {
  type ContentBlock,
  type Highlight,
  type Leg,
  type Location,
  markingColorToken,
} from '@roam/content';
import { parseOsmcSymbol } from '@roam/core';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { resolveColorToken } from '../../lib/colorToken';
import { geometryBbox } from '../../lib/geo';
import { colors, radius, spacing, type } from '../../theme';
import { MapView, TrailLayer, Waymark } from '../map';
import { Chip } from '../ui/Chip';
import { ElevationChart } from './ElevationChart';

// Resolver context — the renderer never reaches into a repo itself. Screens pass
// lookups from the imported store; the dev fixture passes stubs. Keeps the renderer
// the single, data-source-agnostic source of truth for renderable content (§8).
export interface BlockResolve {
  highlight?: (id: string) => Highlight | undefined;
  location?: (id: string) => Location | undefined;
  leg?: (id: string) => Leg | undefined;
  mediaUrl?: (id: string) => string | undefined;
  /** Tap handler for a map preview — opens the full map (later: with a filter). */
  openMap?: () => void;
}

const STATUS = {
  success: colors.status.success,
  warn: colors.status.warn,
  danger: colors.status.danger,
  info: colors.status.progress, // no blue in the system — "info" resolves to progress green
} as const;

// ── shared parts ─────────────────────────────────────────────────────────────

function Heading({ children }: { children: string }) {
  return <Text style={styles.heading}>{children}</Text>;
}

function MediaBox({ uri, style }: { uri?: string; style?: object }) {
  return uri ? (
    <Image source={{ uri }} style={[styles.media, style]} resizeMode="cover" />
  ) : (
    <View style={[styles.media, styles.mediaPlaceholder, style]} />
  );
}

// ── per-kind blocks ──────────────────────────────────────────────────────────

function ProseBlock({ block }: { block: Extract<ContentBlock, { kind: 'prose' }> }) {
  return (
    <View style={styles.block}>
      {block.heading && <Heading>{block.heading}</Heading>}
      <Text style={styles.body}>{block.body}</Text>
    </View>
  );
}

function WhatYouSeeBlock({
  block,
  resolve,
}: {
  block: Extract<ContentBlock, { kind: 'whatYouSee' }>;
  resolve: BlockResolve;
}) {
  return (
    <View style={[styles.block, styles.card, styles.cardRow]}>
      <MediaBox uri={resolve.mediaUrl?.(block.mediaId ?? '')} style={styles.cardThumb} />
      <View style={styles.cardBody}>
        <Text style={styles.kicker}>{block.kicker.toUpperCase()}</Text>
        <Text style={styles.cardTitle}>{block.title}</Text>
        <Text style={styles.meta}>{block.body}</Text>
        {block.source && (
          <View style={styles.sourceChip}>
            <Text style={styles.sourceText}>{block.source}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ElevationBlock({ block }: { block: Extract<ContentBlock, { kind: 'elevation' }> }) {
  // single (stage/route) = silhouette · multiDay (section/whole trail) = columns.
  return (
    <View style={styles.block}>
      <ElevationChart points={block.points} variant={block.variant ?? 'single'} />
    </View>
  );
}

function WaterBlock({
  block,
  resolve,
}: {
  block: Extract<ContentBlock, { kind: 'water' }>;
  resolve: BlockResolve;
}) {
  return (
    <View style={styles.block}>
      {block.header ? <Text style={styles.heading}>{block.header}</Text> : null}
      {block.stops.map((stop, i) => (
        <View key={`${stop.locationId}-${i}`} style={styles.timelineRow}>
          <View style={styles.timelineDot} />
          <Text style={styles.timelineLabel}>
            {resolve.location?.(stop.locationId)?.name ?? stop.locationId}
            {stop.note ? ` · ${stop.note}` : ''}
          </Text>
          <Text style={styles.timelineMeta}>{stop.distanceKm} km</Text>
        </View>
      ))}
    </View>
  );
}

function AccommodationBlock({
  block,
  resolve,
}: {
  block: Extract<ContentBlock, { kind: 'accommodation' }>;
  resolve: BlockResolve;
}) {
  return (
    <View style={styles.block}>
      {block.header ? <Text style={styles.heading}>{block.header}</Text> : null}
      {block.places.map((p, i) => (
        <View key={`${p.locationId}-${i}`} style={styles.listRow}>
          <Text style={styles.listTitle}>
            {resolve.location?.(p.locationId)?.name ?? p.locationId}
          </Text>
          {p.note && <Text style={styles.meta}>{p.note}</Text>}
        </View>
      ))}
    </View>
  );
}

function NavigationBlock({ block }: { block: Extract<ContentBlock, { kind: 'navigation' }> }) {
  return (
    <View style={styles.block}>
      <View style={styles.navRow}>
        {block.marking && (
          <View
            style={[
              styles.markingDot,
              { backgroundColor: resolveColorToken(markingColorToken(block.marking)) },
            ]}
          />
        )}
        <Text style={styles.body}>{block.body}</Text>
      </View>
    </View>
  );
}

function WaymarkBlock({ block }: { block: Extract<ContentBlock, { kind: 'waymark' }> }) {
  // Parse the raw osmc:symbol and draw the painted blaze (§17.8); skip if unparseable.
  const parsed = parseOsmcSymbol(block.osmcSymbol);
  if (!parsed) return null;
  // The real-world blaze is just the painted bars — drop the route number from this render.
  const symbol = { ...parsed, text: null, textColor: null };
  return (
    <View style={[styles.block, styles.waymarkRow]}>
      <Waymark symbol={symbol} size={32} />
      {block.ref ? <Text style={styles.waymarkRef}>{block.ref}</Text> : null}
    </View>
  );
}

function HazardsBlock({ block }: { block: Extract<ContentBlock, { kind: 'hazards' }> }) {
  return (
    <View style={styles.block}>
      {block.header ? <Text style={styles.heading}>{block.header}</Text> : null}
      {block.callouts.map((c) => {
        const pair = STATUS[c.tone];
        return (
          <View key={`${c.tone}:${c.body}`} style={[styles.callout, { backgroundColor: pair.bg }]}>
            <Text style={[styles.calloutText, { color: pair.text }]}>{c.body}</Text>
          </View>
        );
      })}
    </View>
  );
}

function GalleryBlock({
  block,
  resolve,
}: {
  block: Extract<ContentBlock, { kind: 'gallery' }>;
  resolve: BlockResolve;
}) {
  return (
    <View style={[styles.block, styles.galleryRow]}>
      {block.mediaIds.map((id) => (
        <MediaBox key={id} uri={resolve.mediaUrl?.(id)} style={styles.galleryThumb} />
      ))}
    </View>
  );
}

function HighlightsBlock({
  block,
  resolve,
}: {
  block: Extract<ContentBlock, { kind: 'highlights' }>;
  resolve: BlockResolve;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.kicker}>{(block.header ?? 'Highlights').toUpperCase()}</Text>
      {/* A horizontal image carousel (Figma 04a Highlights) — not a vertical list. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.highlightRow}
      >
        {block.highlightIds.map((id) => {
          const h = resolve.highlight?.(id);
          const uri = h?.mediaId ? resolve.mediaUrl?.(h.mediaId) : undefined;
          return (
            <View key={id} style={styles.highlightItem}>
              {uri ? (
                <Image source={{ uri }} style={styles.highlightImage} resizeMode="cover" />
              ) : (
                <View style={[styles.highlightImage, styles.highlightFallback]} />
              )}
              <Text style={styles.highlightTitle} numberOfLines={1}>
                {h?.title ?? id}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ChipsBlock({ block }: { block: Extract<ContentBlock, { kind: 'chips' }> }) {
  return (
    <View style={[styles.block, styles.chipsRow]}>
      {block.items.map((item) => (
        <Chip key={item} label={item} />
      ))}
    </View>
  );
}

function ItineraryBlock({
  block,
  resolve,
}: {
  block: Extract<ContentBlock, { kind: 'itinerary' }>;
  resolve: BlockResolve;
}) {
  return (
    <View style={styles.block}>
      {block.legIds.map((id, i) => {
        const leg = resolve.leg?.(id);
        return (
          <View key={id} style={styles.listRow}>
            <Text style={styles.listTitle}>
              {leg ? `${leg.number}. ${leg.name}` : `Leg ${i + 1}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function StatStripBlock({ block }: { block: Extract<ContentBlock, { kind: 'statStrip' }> }) {
  return (
    <View style={styles.statStrip}>
      {block.stats.map((s) => (
        <View key={s.label} style={styles.statCell}>
          <Text style={styles.statValue}>{s.value}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

// Difficulty meter — segments escalate green → amber → red so the bar reads severity,
// not just a count. Scale labels sit under it with the trail's level emphasised.
const DIFF_COLORS = [
  colors.status.success.text,
  colors.accent,
  colors.status.warn.text,
  colors.status.danger.text,
];
const DIFF_SCALE = ['Easy', 'Moderate', 'Hard', 'Severe'];

function DifficultyBlock({ block }: { block: Extract<ContentBlock, { kind: 'difficulty' }> }) {
  return (
    <View style={styles.block}>
      <View style={styles.diffBar}>
        {Array.from({ length: block.total }, (_, i) => (
          <View
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed positional segments
            key={`seg-${i}`}
            style={[
              styles.diffSeg,
              i < block.level && { backgroundColor: DIFF_COLORS[i] ?? colors.accent },
            ]}
          />
        ))}
      </View>
      <View style={styles.diffScale}>
        {DIFF_SCALE.slice(0, block.total).map((label, i) => (
          <Text
            key={label}
            style={[styles.diffScaleLabel, i === block.level - 1 && styles.diffScaleActive]}
          >
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.diffLabels}>
        <Text style={styles.listTitle}>{block.label}</Text>
        {block.note ? <Text style={styles.meta}>{block.note}</Text> : null}
      </View>
    </View>
  );
}

const MONTHS = [
  { n: 1, l: 'J' },
  { n: 2, l: 'F' },
  { n: 3, l: 'M' },
  { n: 4, l: 'A' },
  { n: 5, l: 'M' },
  { n: 6, l: 'J' },
  { n: 7, l: 'J' },
  { n: 8, l: 'A' },
  { n: 9, l: 'S' },
  { n: 10, l: 'O' },
  { n: 11, l: 'N' },
  { n: 12, l: 'D' },
];
function SeasonBlock({ block }: { block: Extract<ContentBlock, { kind: 'season' }> }) {
  const best = new Set(block.best);
  return (
    <View style={styles.block}>
      <View style={styles.seasonRow}>
        {MONTHS.map((m) => {
          const on = best.has(m.n);
          return (
            <View key={`month-${m.n}`} style={[styles.monthPill, on && styles.monthPillOn]}>
              <Text style={on ? styles.monthOn : styles.monthOff}>{m.l}</Text>
            </View>
          );
        })}
      </View>
      {block.note ? <Text style={styles.meta}>{block.note}</Text> : null}
    </View>
  );
}

function MapBlock({
  block,
  resolve,
}: {
  block: Extract<ContentBlock, { kind: 'map' }>;
  resolve: BlockResolve;
}) {
  const bounds = block.geojson.features.length ? geometryBbox(block.geojson as never) : undefined;
  const map = (
    <View style={[styles.block, styles.mapContainer]} pointerEvents="none">
      <MapView bounds={bounds ?? undefined} interactive={false}>
        <TrailLayer
          id="content-map"
          geojson={block.geojson}
          color={block.color ?? colors.map.route}
        />
      </MapView>
    </View>
  );
  // The preview is non-interactive; tapping it opens the full map (later: with a filter).
  return resolve.openMap ? <Pressable onPress={resolve.openMap}>{map}</Pressable> : map;
}

// ── dispatcher ─────────────────────────────────────────────────────────────

function Block({ block, resolve }: { block: ContentBlock; resolve: BlockResolve }) {
  switch (block.kind) {
    case 'prose':
      return <ProseBlock block={block} />;
    case 'whatYouSee':
      return <WhatYouSeeBlock block={block} resolve={resolve} />;
    case 'elevation':
      return <ElevationBlock block={block} />;
    case 'water':
      return <WaterBlock block={block} resolve={resolve} />;
    case 'accommodation':
      return <AccommodationBlock block={block} resolve={resolve} />;
    case 'navigation':
      return <NavigationBlock block={block} />;
    case 'waymark':
      return <WaymarkBlock block={block} />;
    case 'hazards':
      return <HazardsBlock block={block} />;
    case 'gallery':
      return <GalleryBlock block={block} resolve={resolve} />;
    case 'highlights':
      return <HighlightsBlock block={block} resolve={resolve} />;
    case 'chips':
      return <ChipsBlock block={block} />;
    case 'itinerary':
      return <ItineraryBlock block={block} resolve={resolve} />;
    case 'difficulty':
      return <DifficultyBlock block={block} />;
    case 'season':
      return <SeasonBlock block={block} />;
    case 'statStrip':
      return <StatStripBlock block={block} />;
    case 'map':
      return <MapBlock block={block} resolve={resolve} />;
    default: {
      // Exhaustiveness: a new ContentBlock kind is a compile error until handled.
      const _never: never = block;
      return _never;
    }
  }
}

/** Render a ContentBlock[] — one renderer, one sub-component per kind. Screens are
 *  thin wrappers around this; new content types are new kinds, never new screens. */
export function ContentBlockRenderer({
  blocks,
  resolve = {},
}: {
  blocks: ContentBlock[];
  resolve?: BlockResolve;
}) {
  return (
    <View style={styles.stack}>
      {blocks.map((block, i) => (
        <Block key={`${block.kind}-${i}`} block={block} resolve={resolve} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing[12] + spacing[2] },
  block: { gap: spacing[5] },
  heading: { ...type.sectionHeader, color: colors.text.primary },
  body: { ...type.body, color: colors.text.primary },
  meta: { ...type.meta, color: colors.text.secondary },
  kicker: { ...type.label, color: colors.text.secondary },
  card: {
    backgroundColor: colors.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    borderRadius: radius.xl,
    padding: spacing[6],
    gap: spacing[3],
  },
  cardRow: { flexDirection: 'row', gap: spacing[6] },
  cardThumb: { width: 84, height: 84 },
  cardBody: { flex: 1, gap: 5 },
  cardTitle: { ...type.cardTitle, color: colors.text.primary },
  sourceChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.subtle,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: 3,
  },
  sourceText: { ...type.meta, color: colors.text.secondary },
  media: { borderRadius: radius.lg, backgroundColor: colors.bg.subtle },
  mediaPlaceholder: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border.default },
  galleryRow: { flexDirection: 'row', gap: spacing[4] },
  galleryThumb: { width: 150, height: 104 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[5] },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.marker.water },
  timelineLabel: { ...type.body, color: colors.text.primary, flex: 1 },
  timelineMeta: { ...type.dataMeta, color: colors.text.secondary },
  listRow: { paddingVertical: spacing[3], gap: 2 },
  listTitle: { ...type.bodyStrong, color: colors.text.primary },
  navRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4] },
  markingDot: { width: 12, height: 12, borderRadius: 6, marginTop: 5 },
  waymarkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  waymarkRef: { ...type.bodyStrong, color: colors.text.primary },
  callout: { borderRadius: radius.lg, padding: spacing[6] },
  calloutText: { ...type.meta },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  bullet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent },
  highlightRow: { gap: spacing[4], paddingRight: spacing[4] },
  highlightItem: { width: 156, gap: spacing[2] },
  highlightImage: {
    width: 156,
    height: 112,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.subtle,
  },
  highlightFallback: { backgroundColor: colors.bg.subtle },
  highlightTitle: { ...type.cardTitle, color: colors.text.primary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
  mapContainer: { height: 200, borderRadius: radius.xl, overflow: 'hidden' },
  statStrip: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
    paddingVertical: spacing[5],
  },
  statCell: { flex: 1, alignItems: 'center', gap: spacing[1] },
  statValue: { ...type.statValue, color: colors.text.primary },
  statLabel: { ...type.label, color: colors.text.secondary },
  diffBar: { flexDirection: 'row', gap: spacing[3], height: 8 },
  diffSeg: { flex: 1, borderRadius: 360, backgroundColor: colors.bg.subtle },
  diffScale: { flexDirection: 'row', gap: spacing[3], paddingTop: spacing[2] },
  diffScaleLabel: { ...type.label, flex: 1, textAlign: 'center', color: colors.text.secondary },
  diffScaleActive: { color: colors.text.primary },
  diffLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[2],
  },
  seasonRow: { flexDirection: 'row', gap: spacing[2] },
  monthPill: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.full,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPillOn: { backgroundColor: colors.accent },
  monthOn: { ...type.dataMeta, color: colors.text.onAccent },
  monthOff: { ...type.dataMeta, color: colors.text.secondary },
});
