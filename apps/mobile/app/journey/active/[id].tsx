import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActiveControlBar, OptionsSheet } from '../../../components/journey';
import {
  MapView,
  type MapViewHandle,
  POILayer,
  TrailLayer,
  UserMarker,
} from '../../../components/map';
import { Icon, IconButton, RoamMark } from '../../../components/ui';
import { stageSubGeometry, stageViewport } from '../../../lib/activeJourney';
import { formatElevationM, formatKm, orientRoute, routeChainPlaces } from '../../../lib/format';
import { locateOnLine } from '../../../lib/geo';
import {
  useJourney,
  useTrail,
  useTrailAccommodations,
  useTrailSections,
  useTrailWater,
  useTrails,
} from '../../../lib/hooks';
import { sectionsForDay } from '../../../lib/sections';
import { useJourneyProgress } from '../../../lib/useJourneyProgress';
import { useUserLocation } from '../../../lib/useUserLocation';
import { colors, fonts, layout, radius, spacing, type } from '../../../theme';

// Finish journey is destructive — gate it behind a confirm.
function confirmFinishJourney(end: () => void) {
  Alert.alert(
    'Finish journey?',
    'Ends the journey and logs it as complete — it stays in your journeys.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Finish journey', style: 'destructive', onPress: end },
    ],
  );
}

// The on-trail Guide chat is not built yet (Guide Core, §12 / phase 8).
function askGuide() {
  Alert.alert('Guide', 'The on-trail Guide is coming soon.');
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ActiveJourneyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(true);
  const mapRef = useRef<MapViewHandle>(null);
  const { progress } = useJourneyProgress(id);
  const { coords } = useUserLocation();

  // The stats sheet folds by dragging its handle — down to collapse, up to expand.
  const statsPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 12) setStatsExpanded(false);
        else if (g.dy < -12) setStatsExpanded(true);
      },
    }),
  ).current;

  const { data: journeyResponse, isLoading } = useJourney(id);
  const rawJourney = journeyResponse?.data;
  const journey = rawJourney && !('error' in rawJourney) ? rawJourney : null;

  const { data: trailsData } = useTrails();
  const trail = trailsData?.data?.find((t) => t.routeId === journey?.routeId);
  const trailIdStr = String(trail?.id ?? 0);
  const enabled = { query: { enabled: !!trail?.id } };
  const { data: trailResponse } = useTrail(trailIdStr, enabled);
  const { data: waterResponse } = useTrailWater(trailIdStr, enabled);
  const { data: accommResponse } = useTrailAccommodations(trailIdStr, enabled);
  const { data: sectionsResponse } = useTrailSections(trailIdStr, enabled);

  if (isLoading || !journey) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const reverse = journey.direction === 'reverse';
  const walkStages = journey.stages.filter((s) => !s.restDay);
  const currentStage =
    journey.stages.find((s) => !s.restDay && s.status !== 'completed') ?? walkStages[0];

  if (!currentStage) {
    return (
      <View style={styles.loading}>
        <Text style={styles.statLabel}>No stages to walk.</Text>
      </View>
    );
  }

  const dayNum = Math.max(1, walkStages.findIndex((s) => s.id === currentStage.id) + 1);
  const lo = Math.min(currentStage.startChainageM, currentStage.endChainageM);
  const hi = Math.max(currentStage.startChainageM, currentStage.endChainageM);

  const geojson = trailResponse?.data && 'type' in trailResponse.data ? trailResponse.data : null;
  const totalM = trail?.distanceM ?? null;
  const stageGeom = stageSubGeometry(geojson, lo, hi, totalM);
  const viewport = stageViewport(geojson, lo, hi, totalM);

  const allWater = Array.isArray(waterResponse?.data) ? waterResponse.data : [];
  const allAccomm = Array.isArray(accommResponse?.data) ? accommResponse.data : [];
  const water = allWater.filter((p) => p.chainageM >= lo && p.chainageM <= hi);
  const accomm = allAccomm.filter((p) => p.chainageM >= lo && p.chainageM <= hi);

  // The day's route as a place chain (e.g. Espinal → Burguete).
  const sectionRanges = Array.isArray(sectionsResponse?.data) ? sectionsResponse.data : [];
  const daySections = sectionsForDay(
    sectionRanges,
    currentStage.startChainageM,
    currentStage.endChainageM,
  );
  const routeLabel =
    routeChainPlaces(daySections.map((s) => orientRoute(s.name, reverse))).join(' → ') ||
    `Day ${dayNum}`;

  const isPaused = journey.status === 'paused';
  const journeyName = journey.name?.trim() || trail?.ref || trail?.name || 'Journey';
  const totalDistanceM = walkStages.reduce((a, s) => a + (s.distanceM ?? 0), 0);
  const doneDistanceM = walkStages
    .filter((s) => s.status === 'completed')
    .reduce((a, s) => a + (s.distanceM ?? 0), 0);
  const progressLabel = `Day ${dayNum} of ${walkStages.length} · ${formatKm(doneDistanceM)} of ${formatKm(totalDistanceM)} walked`;

  // Live position: project GPS onto the route → chainage (§7), then derive the
  // current-stage distances by 1-D subtraction. Ignored when off-route or no fix.
  const OFF_ROUTE_M = 150;
  const located = coords ? locateOnLine(geojson, [coords.lng, coords.lat]) : null;
  const userChainageM =
    located && located.offRouteM <= OFF_ROUTE_M && totalM ? located.fraction * totalM : null;
  const stageLen = hi - lo;
  const clamp = (v: number) => Math.max(0, Math.min(stageLen, v));
  const walkedM =
    userChainageM != null ? clamp(Math.abs(userChainageM - currentStage.startChainageM)) : null;
  const toGoM =
    userChainageM != null ? clamp(Math.abs(currentStage.endChainageM - userChainageM)) : null;
  const speedKmh = coords?.speedMps != null && coords.speedMps >= 0 ? coords.speedMps * 3.6 : null;
  const altitudeM = coords?.altitudeM ?? null;

  // Pause is an immediate, reversible toggle — no menu, no confirm.
  const toggleNavigation = () => {
    progress.mutate({ type: isPaused ? 'resume' : 'pause' });
  };
  const finishStage = () => {
    progress.mutate(
      { type: 'completeStage', stageId: currentStage.id },
      {
        onSuccess: () => {
          setSheetOpen(false);
          router.push(`/journey/complete/${id}`);
        },
      },
    );
  };
  const finishJourney = () => {
    confirmFinishJourney(() =>
      progress.mutate(
        { type: 'end' },
        {
          onSuccess: () => {
            setSheetOpen(false);
            router.replace('/(tabs)/journeys');
          },
        },
      ),
    );
  };

  return (
    <View style={styles.screen}>
      <MapView ref={mapRef} center={viewport?.center} zoom={viewport?.zoom}>
        {geojson && (
          <TrailLayer
            id="trail-full"
            geojson={geojson as never}
            color={colors.trail.gr}
            width={2}
            opacity={0.25}
          />
        )}
        {stageGeom && (
          <TrailLayer
            id="stage-line"
            geojson={{ type: 'Feature', geometry: stageGeom as never, properties: {} }}
            color={colors.trail.gr}
            width={4}
            opacity={1}
          />
        )}
        <POILayer
          id="active-water"
          pois={water}
          color={colors.marker.water}
          radius={6}
          annotationMode
          onPress={(wid) => router.push(`/poi/water/${wid}`)}
        />
        <POILayer
          id="active-accomm"
          pois={accomm}
          color={colors.marker.refuge}
          radius={7}
          annotationMode
          onPress={(aid) => router.push(`/poi/accommodation/${aid}`)}
        />
        {coords && <UserMarker coord={[coords.lng, coords.lat]} />}
      </MapView>

      {/* Paused context chip — the Resume button is the state signal; this
          pins where you are while paused. */}
      {isPaused && (
        <View style={[styles.pausedChip, { top: insets.top + spacing[4] }]} pointerEvents="none">
          <Text style={styles.pausedChipText}>
            {`PAUSED · DAY ${dayNum} · ${routeLabel.toUpperCase()}`}
          </Text>
        </View>
      )}

      {/* Back */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => (router.canGoBack() ? router.back() : router.replace(`/journey/${id}`))}
      >
        <Icon name="arrow-left" size={20} color={colors.accent} />
      </TouchableOpacity>

      {/* Center-on-me — always visible; disabled until we have a fix. */}
      <View style={[styles.recenter, { top: insets.top + 8 }]}>
        <IconButton
          icon="locate"
          style="surface"
          size="lg"
          disabled={!coords}
          onPress={() => coords && mapRef.current?.centerOn([coords.lng, coords.lat], 13)}
        />
      </View>

      {/* Floating dock — controls sit over the map; stats fold away. */}
      <View
        style={[styles.dock, { paddingBottom: insets.bottom + spacing[4] }]}
        pointerEvents="box-none"
      >
        <View style={styles.statsCard} {...statsPan.panHandlers}>
          {statsExpanded ? (
            <>
              <View style={styles.grabber} />
              <View style={styles.stageSummary}>
                {/* Blaze placement (3): the chip beside "DAY n OF m". */}
                <View style={styles.summaryDayRow}>
                  <RoamMark width={14} />
                  <Text style={styles.summaryDay}>
                    DAY {dayNum} OF {walkStages.length}
                  </Text>
                </View>
                <Text style={styles.summaryTitle} numberOfLines={1}>
                  {routeLabel}
                </Text>
                <Text style={styles.summaryMeta}>
                  {formatKm(currentStage.distanceM)} · ↑ {formatElevationM(currentStage.ascentM)}
                </Text>
              </View>
              {/* Distance/altitude/speed/to-go are live; avg speed, moving and
                  ascent-climbed need a tracking session (later phase) → "—". */}
              <View style={styles.statsRow}>
                <Stat value={walkedM != null ? formatKm(walkedM) : '—'} label="distance" />
                <Stat value="—" label="ascent" />
                <Stat
                  value={altitudeM != null ? formatElevationM(altitudeM) : '—'}
                  label="altitude"
                />
              </View>
              <View style={styles.statsRow}>
                <Stat
                  value={speedKmh != null ? `${speedKmh.toFixed(1)} km/h` : '—'}
                  label="speed"
                />
                <Stat value="—" label="moving" />
                <Stat value={toGoM != null ? formatKm(toGoM) : '—'} label="to go" />
              </View>
              <View style={styles.statsDivider} />
              <Text style={styles.statsEta}>ETA — · Sunset —</Text>
              <View style={styles.statsWeather}>
                <Icon name="cloud" size={15} color={colors.text.secondary} />
                <Text style={styles.statsWeatherText}>—</Text>
              </View>
            </>
          ) : (
            <View style={styles.statsCollapsed}>
              <View style={styles.grabber} />
              <Text style={styles.statsCollapsedText} numberOfLines={1}>
                {formatKm(currentStage.distanceM)} · ↑{formatElevationM(currentStage.ascentM)} · Day{' '}
                {dayNum}/{walkStages.length}
              </Text>
            </View>
          )}
        </View>

        <ActiveControlBar
          paused={isPaused}
          pending={progress.isPending}
          moreSize="lg"
          onToggle={toggleNavigation}
          onMore={() => setSheetOpen(true)}
        />
      </View>

      <OptionsSheet
        visible={sheetOpen}
        context="map"
        journeyName={journeyName}
        progressLabel={progressLabel}
        finishStageSubtitle={`Mark Day ${dayNum} complete and unlock Day ${dayNum + 1}.`}
        pending={progress.isPending}
        onNavigate={() => {
          setSheetOpen(false);
          router.push(`/journey/${id}`);
        }}
        onAskGuide={askGuide}
        onFinishStage={finishStage}
        onFinishJourney={finishJourney}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const SHADOW = {
  shadowColor: colors.accent,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 4,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.app,
  },

  backBtn: {
    position: 'absolute',
    left: spacing[8],
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.overlay.frosted,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  recenter: { position: 'absolute', right: spacing[8], ...SHADOW },

  // Floating dock over the map — no full-width backdrop, so the map shows through.
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.screenPadding,
    gap: spacing[3],
  },
  statsCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    paddingTop: spacing[3],
    paddingBottom: spacing[5],
    paddingHorizontal: spacing[6],
    gap: spacing[5],
    ...SHADOW,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
  },
  pausedChip: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.text.primary,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radius.full,
  },
  pausedChipText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.2,
    color: colors.text.onAccent,
  },
  stageSummary: { gap: spacing[1] },
  summaryDayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  summaryDay: { ...type.label, color: colors.text.secondary },
  summaryTitle: { ...type.sectionHeader, color: colors.text.primary },
  summaryMeta: { ...type.meta, color: colors.text.secondary },
  statsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stat: { flex: 1, alignItems: 'flex-start', gap: spacing[1] },
  statValue: { ...type.statValue, color: colors.text.primary },
  statLabel: { ...type.meta, color: colors.text.secondary },
  statsDivider: { height: 1, backgroundColor: colors.border.default },
  statsEta: { ...type.meta, color: colors.text.secondary },
  statsWeather: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  statsWeatherText: { ...type.meta, color: colors.text.secondary },
  statsCollapsed: { gap: spacing[3] },
  statsCollapsedText: { ...type.detailTab, color: colors.text.primary },
});
