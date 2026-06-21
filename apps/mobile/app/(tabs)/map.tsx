import { Marker } from '@maplibre/maplibre-react-native';
import {
  type Difficulty,
  type FilterDimension,
  type MapEntity,
  type MapFilters,
  activeFilterChips,
  facetOptions,
  filterEntities,
  symbolKey,
  toggleFilterValue,
} from '@roam/core';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  type CarouselItem,
  FilterSheet,
  MapImages,
  MapView,
  type MapViewHandle,
  NativePOILayer,
  SectionEndpoints,
  TRAIL_CARD_HEIGHT,
  TrailBlaze,
  TrailCarousel,
  TrailLayer,
  UserMarker,
} from '../../components/map';
import { Chip, Icon, IconButton } from '../../components/ui';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../../config/map';
import { useStartJourneyFromContent } from '../../lib/contentJourney';
import { contentStore, mediaFor } from '../../lib/contentRepo';
import { geometryBbox } from '../../lib/geo';
import { useTrail, useTrailAccommodations, useTrailWater, useTrails } from '../../lib/hooks';
import { useUserLocation } from '../../lib/useUserLocation';
import { useMapStore } from '../../store/mapStore';
import { colors, fonts, radius, spacing, type } from '../../theme';

// ---------------------------------------------------------------------------
// Geometry label — rendered on the map at trail/section midpoint
// ---------------------------------------------------------------------------

function GeometryLabel({
  center,
  label,
  onPress,
}: {
  center: [number, number];
  label: string;
  onPress: () => void;
}) {
  return (
    // key forces a remount when the label changes: MapLibre's native Marker
    // rejects an `id` change after mount, so we swap the instance instead.
    <Marker key={`label-${label}`} id={`label-${label}`} lngLat={center}>
      <TouchableOpacity style={styles.geoLabel} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.geoLabelText}>{label}</Text>
      </TouchableOpacity>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// One trail's route on the map — its own geometry + POIs + blaze. Rendered once
// per trail so the map shows every route (GR11, GR10, …), each in its osmc way
// colour with its painted blaze (§17.2/§17.8). Hooks-per-component keeps the
// per-trail fetches valid while the trail list grows.
// ---------------------------------------------------------------------------

type MapTrail = {
  id: number;
  ref?: string | null;
  name?: string | null;
  country?: string | null;
  region?: string | null;
  distanceM?: number | null;
  elevation?: number[];
  waymark?: { symbol?: import('@roam/core').OsmcSymbol | null } | null;
};

// The content slug for a trail (its objective id) — "GR11" → "gr11".
const trailSlug = (t: MapTrail) => (t.ref ?? t.name ?? '').toLowerCase().replace(/\s+/g, '');

// A trail's slide-up carousel preview — content stats/overview/image by slug + the API
// trail's elevation. Null when there's no content objective to preview.
function carouselItem(t: MapTrail): CarouselItem | null {
  const slug = trailSlug(t);
  const o = contentStore.objectiveSummaries.get(slug);
  if (!o) return null;
  const val = (k: string) => o.atAGlance.find((s) => s.key === k)?.value;
  const d = val('distance');
  const a = val('ascent');
  const days = val('days');
  const statLine = [
    d != null ? `${Math.round(Number(d))} km` : null,
    a != null ? `↑ ${a} m` : null,
    days != null ? `${days} days` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const diff = trailDifficulty(slug);
  return {
    objectiveId: slug,
    title: o.name,
    subtitle: [t.country, t.region].filter(Boolean).join(' · '),
    image: mediaFor(o.heroMediaId)?.uri,
    difficulty: diff ? diff.charAt(0).toUpperCase() + diff.slice(1) : undefined,
    statLine,
  };
}

// Hiking-band stage grade → the MapEntity difficulty scale (severe = expert).
const GRADE_TO_DIFFICULTY: Record<string, Difficulty> = {
  easy: 'easy',
  moderate: 'moderate',
  hard: 'hard',
  severe: 'expert',
};
const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, moderate: 1, hard: 2, expert: 3 };

// A trail's difficulty, derived from its content stages' grades: the 75th-percentile grade,
// so a few hard/severe days set the rating (the trail's challenge) without one severe stage
// labelling the whole route. GR11 → hard, GR10 → expert. undefined when there are no stages.
function trailDifficulty(slug: string): Difficulty | undefined {
  const sectionIds = new Set(
    [...contentStore.sectionSummaries.values()]
      .filter((s) => s.objectiveId === slug)
      .map((s) => s.id),
  );
  const ranked = [...contentStore.stageSummaries.values()]
    .filter((s) => sectionIds.has(s.sectionId))
    .map((s) => GRADE_TO_DIFFICULTY[s.grade.value])
    .filter((d): d is Difficulty => !!d)
    .sort((a, b) => DIFFICULTY_RANK[a] - DIFFICULTY_RANK[b]);
  return ranked.length ? ranked[Math.floor(ranked.length * 0.75)] : undefined;
}

// API trail → the @roam/core MapEntity the filter engine works on (§14). Difficulty is
// derived from the matching content objective's stage grades (the API trail has none).
function trailToEntity(t: MapTrail): MapEntity {
  const slug = (t.ref ?? t.name ?? '').toLowerCase().replace(/\s+/g, '');
  return {
    id: String(t.id),
    kind: 'trail',
    name: t.name ?? t.ref ?? '',
    ref: t.ref,
    country: t.country,
    region: t.region,
    distanceM: t.distanceM,
    difficulty: trailDifficulty(slug),
  };
}

function TrailRoute({
  trail,
  focusedObjectiveId,
  focusScoped,
  legacyDim,
  selectedObjectiveId,
  onSelect,
}: {
  trail: MapTrail;
  focusedObjectiveId: string | null;
  focusScoped: boolean;
  legacyDim: boolean;
  /** The carousel-selected trail — emphasised; the others dim (no focus). */
  selectedObjectiveId: string | null;
  /** Tapping the line previews the trail in the carousel (not straight to its guide). */
  onSelect: (slug: string) => void;
}) {
  const router = useRouter();
  const id = String(trail.id);
  const enabled = { query: { enabled: !!trail.id } };
  const { data: trailResponse } = useTrail(id, enabled);
  const { data: waterResponse } = useTrailWater(id, enabled);
  const { data: accommResponse } = useTrailAccommodations(id, enabled);

  const rawTrail = trailResponse?.data;
  const geojson = rawTrail && 'type' in rawTrail ? rawTrail : null;
  const water = Array.isArray(waterResponse?.data) ? waterResponse.data : [];
  const accommodations = Array.isArray(accommResponse?.data) ? accommResponse.data : [];

  const symbol = trail.waymark?.symbol ?? null;
  const color = symbol?.wayColor ?? colors.map.route;
  const blazeImage = symbol ? `blaze-${symbolKey(symbol)}` : undefined;
  // 'GR11' → 'gr11', 'GR 10' → 'gr10' — route the line tap to the new objective Guide.
  const slug = (trail.ref ?? trail.name ?? '').toLowerCase().replace(/\s+/g, '');

  // A content focus is a single-entity view: show ONLY the focused trail (hide the rest).
  const isFocused = !!focusedObjectiveId && focusedObjectiveId === slug;
  const focusActive = !!focusedObjectiveId;
  if (focusActive && !isFocused) return null;

  // Three line treatments: 'full' (selected/focused) = bold + blaze; 'muted' (unselected,
  // browseable) = thin + faded, no blaze; 'dim' (legacy section / focused-but-scoped slice).
  const isSelected = !focusActive && selectedObjectiveId === slug;
  const treatment = legacyDim
    ? 'dim'
    : focusActive
      ? focusScoped
        ? 'dim'
        : 'full'
      : isSelected
        ? 'full'
        : 'muted';
  const lineWidth = treatment === 'full' ? 4 : treatment === 'muted' ? 2.5 : 2;
  const lineOpacity = treatment === 'full' ? 1 : treatment === 'muted' ? 0.5 : 0.25;

  if (!geojson) return null;

  return (
    <>
      <TrailLayer
        id={`trail-${trail.id}`}
        geojson={geojson as never}
        color={color}
        width={lineWidth}
        opacity={lineOpacity}
        onPress={slug ? () => onSelect(slug) : undefined}
      />
      {blazeImage && treatment === 'full' && (
        <TrailBlaze id={`blaze-${trail.id}`} geojson={geojson as never} image={blazeImage} />
      )}
      {/* Highlighting a trail (carousel-selected) shows its start + end points (like web). */}
      {isSelected && <SectionEndpoints geom={geojson as unknown as Record<string, unknown>} />}
      {isFocused && (
        <>
          <NativePOILayer
            id={`water-${trail.id}`}
            kind="water"
            pois={water}
            onPress={(pid) => router.push(`/poi/water/${pid}`)}
          />
          <NativePOILayer
            id={`accommodations-${trail.id}`}
            kind="accommodation"
            pois={accommodations}
            onPress={(pid) => router.push(`/poi/accommodation/${pid}`)}
          />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    pendingViewport,
    activeSectionId,
    activeSectionLabel,
    activeSectionGeomCenter,
    activeSectionGeom,
    focus,
    clearFocusScope,
    clearFocus,
  } = useMapStore();
  const { start } = useStartJourneyFromContent();

  // The focused geometry (scope slice, else whole route) + the box to frame it.
  const focusGeom = focus?.scope?.geom ?? focus?.routeGeom ?? null;
  const focusBounds = useMemo(
    () =>
      focusGeom
        ? (geometryBbox(focusGeom as unknown as Record<string, unknown>) ?? undefined)
        : undefined,
    [focusGeom],
  );

  const [viewport, setLocalViewport] = useState({
    center: MAP_DEFAULT_CENTER as [number, number],
    zoom: MAP_DEFAULT_ZOOM,
  });

  const { coords } = useUserLocation();
  const mapRef = useRef<MapViewHandle>(null);

  // Depend on the serialized viewport so the map re-flies only when the pushed
  // value changes, not on every identity change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: value-based dep on pendingViewport is intentional
  useEffect(() => {
    if (pendingViewport) {
      setLocalViewport(pendingViewport);
      // Don't call setViewport here — it would cause an infinite loop.
      // pendingViewport is consumed once and ignored until next setSectionFilter call.
    }
  }, [JSON.stringify(pendingViewport)]);

  // Frame the focused entity once, when it changes (search/card/preview → here). Clearing
  // the focus does nothing, so the camera stays put and just renders the trails that return.
  // biome-ignore lint/correctness/useExhaustiveDependencies: value-based dep on focusBounds is intentional
  useEffect(() => {
    if (focusBounds) mapRef.current?.fitBounds(focusBounds);
  }, [JSON.stringify(focusBounds)]);

  // Every trail on the map — each draws its own route line + blaze (TrailRoute).
  const { data: trailsResponse } = useTrails();
  const trails = (trailsResponse?.data ?? []) as MapTrail[];
  const isSectionActive = !!activeSectionId;
  const focusedObjectiveId = focus?.objectiveId ?? null;
  const focusScoped = !!focus?.scope;

  // Filters narrow which trails render (§14). The chip groups live in the FilterSheet; the
  // active selection shows as removable chips on the map.
  const [filters, setFilters] = useState<MapFilters>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const entities = useMemo(() => trails.map(trailToEntity), [trails]);
  const shownIds = useMemo(
    () => new Set(filterEntities(entities, filters).map((e) => e.id)),
    [entities, filters],
  );
  const shownTrails = trails.filter((t) => shownIds.has(String(t.id)));
  // Country/range chips from the data — the facets that actually distinguish trails.
  const countries = useMemo(
    () => facetOptions(entities, 'country').map((f) => ({ id: f.value, label: f.label })),
    [entities],
  );
  const regions = useMemo(
    () => facetOptions(entities, 'region').map((f) => ({ id: f.value, label: f.label })),
    [entities],
  );
  const activeChips = activeFilterChips(filters);
  const toggle = (dim: FilterDimension, value: string) =>
    setFilters((f) => toggleFilterValue(f, dim, value));

  // Tapping a trail pops up a preview card + highlights it; ✕ or a map tap dismisses it.
  const [selectedTrail, setSelectedTrail] = useState<string | null>(null);
  // A trail-line tap also fires the map's background onPress; this flag swallows that one
  // press so selecting a trail isn't instantly cleared by the click-away.
  const justSelected = useRef(false);
  const selectTrail = (slug: string) => {
    justSelected.current = true;
    setSelectedTrail(slug);
    setTimeout(() => {
      justSelected.current = false;
    }, 300);
  };
  const dismissOnMapPress = () => {
    if (justSelected.current) return;
    setSelectedTrail(null);
  };
  // One preview card for both entry points: a search/preview focus (focus.objectiveId) and a
  // direct trail tap (selectedTrail). The card carries Start journey for either.
  const cardObjectiveId = focus?.objectiveId ?? selectedTrail;
  const cardTrail = cardObjectiveId
    ? trails.find((t) => trailSlug(t) === cardObjectiveId)
    : undefined;
  const cardItem = cardTrail ? carouselItem(cardTrail) : null;
  const showCard = cardItem !== null;

  return (
    <View style={styles.screen}>
      {/* Full-screen map. A focus frames its geometry imperatively (below), so clearing the
          focus leaves the camera where it is instead of snapping back. */}
      <MapView
        ref={mapRef}
        center={viewport.center}
        zoom={viewport.zoom}
        onPress={dismissOnMapPress}
      >
        {/* Register all map sprites once for the native SymbolLayers. */}
        <MapImages />
        {/* Each trail's route + blaze, in its osmc way colour. POIs + endpoints only render
            for the focused trail — the all-trails view stays line-only (§17.5). */}
        {shownTrails.map((t) => (
          <TrailRoute
            key={t.id}
            trail={t}
            focusedObjectiveId={focusedObjectiveId}
            focusScoped={focusScoped}
            legacyDim={isSectionActive}
            selectedObjectiveId={!focus ? selectedTrail : null}
            onSelect={selectTrail}
          />
        ))}
        {activeSectionGeom && (
          <TrailLayer
            id="section-highlight"
            geojson={{ type: 'Feature', geometry: activeSectionGeom as never, properties: {} }}
            color={colors.map.route}
            width={4}
            opacity={1}
          />
        )}
        {activeSectionGeom && <SectionEndpoints geom={activeSectionGeom} />}
        {activeSectionGeomCenter && activeSectionLabel && (
          <GeometryLabel
            center={activeSectionGeomCenter}
            label={activeSectionLabel}
            onPress={() => router.push(`/section/${activeSectionId}`)}
          />
        )}
        {/* Content focus highlight — the searched/browsed trail, section, stage or segment,
            in the trail's own way colour (red for GR11), with its start/finish endpoints. */}
        {focusGeom && (
          <TrailLayer
            id="focus-highlight"
            geojson={{ type: 'Feature', geometry: focusGeom as never, properties: {} }}
            color={focus?.color ?? colors.map.route}
            width={4}
            opacity={1}
          />
        )}
        {focusGeom && <SectionEndpoints geom={focusGeom as unknown as Record<string, unknown>} />}
        {coords && <UserMarker coord={[coords.lng, coords.lat]} headingDeg={coords.headingDeg} />}
      </MapView>

      {/* Search bar → the search screen */}
      <TouchableOpacity
        style={[styles.searchBar, { top: insets.top + 8 }]}
        activeOpacity={0.85}
        onPress={() => router.push('/search')}
      >
        <Icon name="search" size={18} color={colors.text.secondary} />
        <Text style={styles.searchPlaceholder}>Search trails, peaks, refuges…</Text>
        <Icon name="microphone" size={18} color={colors.text.secondary} />
      </TouchableOpacity>

      {/* Focus chips — remove the scope to widen to the whole trail; remove the trail to clear. */}
      {focus ? (
        <View style={[styles.chips, { top: insets.top + 8 + 44 + spacing[3] }]}>
          <Chip label={focus.trailLabel} suffix="✕" selected onPress={clearFocus} />
          {focus.scope && (
            <Chip label={focus.scope.label} suffix="✕" selected onPress={clearFocusScope} />
          )}
        </View>
      ) : (
        // Filter row — the funnel opens the sheet; active filters show as removable chips.
        <View style={[styles.chips, { top: insets.top + 8 + 44 + spacing[3] }]}>
          <IconButton icon="filter" style="surface" size="md" onPress={() => setFilterOpen(true)} />
          {activeChips.map((chip) => (
            <Chip
              key={`${chip.dimension}:${chip.value}`}
              label={chip.label}
              suffix="✕"
              selected
              onPress={() => toggle(chip.dimension, chip.value)}
            />
          ))}
        </View>
      )}

      {/* Center-on-me — bottom-right; sits just above the trail peek / Start CTA. */}
      <View
        style={[
          styles.locate,
          {
            bottom: showCard
              ? TRAIL_CARD_HEIGHT + spacing[4] + spacing[3]
              : insets.bottom + spacing[12],
          },
        ]}
      >
        <IconButton
          icon="locate"
          style="surface"
          size="lg"
          disabled={!coords}
          onPress={() => coords && mapRef.current?.centerOn([coords.lng, coords.lat], 13)}
        />
      </View>

      {/* Trail preview card — the one surface for a tap-selected OR search/preview-focused
          trail. Tap opens the guide; Start journey runs the (scoped) setup; ✕ dismisses. */}
      {showCard && cardItem && (
        <View style={styles.carousel}>
          <TrailCarousel
            item={cardItem}
            onClose={() => {
              clearFocus();
              setSelectedTrail(null);
            }}
            onOpen={() =>
              router.push({ pathname: '/objective/[id]', params: { id: cardItem.objectiveId } })
            }
            onStart={() =>
              start(cardItem.objectiveId, {
                fromStageId: focus?.scope?.fromStageId,
                toStageId: focus?.scope?.toStageId,
              })
            }
          />
        </View>
      )}

      <FilterSheet
        visible={filterOpen}
        filters={filters}
        resultCount={shownIds.size}
        countries={countries}
        regions={regions}
        onToggle={toggle}
        onReset={() => setFilters({})}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1 },

  searchBar: {
    position: 'absolute',
    left: spacing[8],
    right: spacing[8],
    height: 44,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: spacing[4],
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  searchPlaceholder: { ...type.body, color: colors.text.secondary, flex: 1 },

  chips: {
    position: 'absolute',
    left: spacing[8],
    right: spacing[8],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },

  carousel: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[4],
  },

  locate: {
    position: 'absolute',
    right: spacing[8],
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },

  geoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  geoLabelText: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.22,
    color: colors.text.secondary,
  },
  geoLabelArrow: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.text.secondary,
    opacity: 0.5,
  },

  filterContainer: { position: 'absolute', left: 0, right: 0 },
  filterWrap: { paddingHorizontal: spacing[8] },
  filterRow: { gap: spacing[4], flexDirection: 'row', alignItems: 'center' },

  backBtn: {
    position: 'absolute',
    left: spacing[8],
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.overlay.frosted,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
});
