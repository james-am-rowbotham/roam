import { Marker } from '@maplibre/maplibre-react-native';
import {
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
  FilterSheet,
  MapImages,
  MapView,
  type MapViewHandle,
  NativePOILayer,
  SectionEndpoints,
  TrailBlaze,
  TrailLayer,
  UserMarker,
} from '../../components/map';
import { Button, Chip, Icon, IconButton } from '../../components/ui';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../../config/map';
import { useStartJourneyFromContent } from '../../lib/contentJourney';
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
  waymark?: { symbol?: import('@roam/core').OsmcSymbol | null } | null;
};

// API trail → the @roam/core MapEntity the filter engine works on (§14). Difficulty/season
// have no trail data yet, so those filters narrow to nothing until coverage lands.
function trailToEntity(t: MapTrail): MapEntity {
  return {
    id: String(t.id),
    kind: 'trail',
    name: t.name ?? t.ref ?? '',
    ref: t.ref,
    country: t.country,
    region: t.region,
    distanceM: t.distanceM,
  };
}

function TrailRoute({
  trail,
  focusedObjectiveId,
  focusScoped,
  legacyDim,
}: {
  trail: MapTrail;
  focusedObjectiveId: string | null;
  focusScoped: boolean;
  legacyDim: boolean;
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

  // A focus shows this trail as a single entity. Dim every other trail, and dim this one
  // too when a scope (stage/section) is focused so the highlighted slice stands out. POIs +
  // endpoints render only for the focused trail (§17.5) — never in the all-trails view.
  const isFocused = !!focusedObjectiveId && focusedObjectiveId === slug;
  const focusActive = !!focusedObjectiveId;
  const dim = legacyDim || (focusActive && (!isFocused || focusScoped));

  if (!geojson) return null;

  return (
    <>
      <TrailLayer
        id={`trail-${trail.id}`}
        geojson={geojson as never}
        color={color}
        width={dim ? 2 : 4}
        opacity={dim ? 0.25 : 1}
        onPress={
          slug
            ? () => router.push({ pathname: '/objective/[id]', params: { id: slug } })
            : undefined
        }
      />
      {blazeImage && (
        <TrailBlaze id={`blaze-${trail.id}`} geojson={geojson as never} image={blazeImage} />
      )}
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
  const { start, canStart } = useStartJourneyFromContent();

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

  return (
    <View style={styles.screen}>
      {/* Full-screen map. A content focus frames its geometry via `bounds`. */}
      <MapView ref={mapRef} center={viewport.center} zoom={viewport.zoom} bounds={focusBounds}>
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

      {/* Center-on-me — always visible; lifts above the Start CTA when a focus is shown. */}
      <View
        style={[
          styles.locate,
          { bottom: insets.bottom + (focus ? spacing[12] + 56 : spacing[12]) },
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

      {/* Start journey from the focused trail/range (online ref-bridge; hidden when unmatched). */}
      {focus && canStart(focus.objectiveId) && (
        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing[4] }]}>
          <Button
            label="Start journey"
            size="lg"
            fullWidth
            onPress={() =>
              start(focus.objectiveId, {
                fromStageId: focus.scope?.fromStageId,
                toStageId: focus.scope?.toStageId,
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

  cta: {
    position: 'absolute',
    left: spacing[8],
    right: spacing[8],
    bottom: 0,
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
