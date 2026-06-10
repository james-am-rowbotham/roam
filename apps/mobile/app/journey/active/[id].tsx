import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PauseSheet } from '../../../components/journey';
import { MapView, POILayer, TrailLayer } from '../../../components/map';
import { Icon } from '../../../components/ui';
import { nextPoiAhead, stageSubGeometry, stageViewport } from '../../../lib/activeJourney';
import { formatElevationM, formatKm, orientRoute, routeChainPlaces } from '../../../lib/format';
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
import { colors, layout, radius, spacing, type } from '../../../theme';

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
  const { progress } = useJourneyProgress(id);

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

  // Next water / refuge ahead of the day's start, in walking direction.
  const nextWater = nextPoiAhead(allWater, currentStage.startChainageM, reverse);
  const nextRefuge = nextPoiAhead(allAccomm, currentStage.startChainageM, reverse);

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
  // Pause navigation but stay on the map; the primary button then reads "Resume".
  const pauseNavigation = () => {
    progress.mutate({ type: 'pause' }, { onSuccess: () => setSheetOpen(false) });
  };
  // Pause and leave for the day.
  const stopForToday = () => {
    progress.mutate(
      { type: 'pause' },
      {
        onSuccess: () => {
          setSheetOpen(false);
          router.replace('/(tabs)/journeys');
        },
      },
    );
  };
  const resumeNavigation = () => {
    progress.mutate({ type: 'resume' });
  };

  return (
    <View style={styles.screen}>
      <MapView center={viewport?.center} zoom={viewport?.zoom}>
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
      </MapView>

      {/* Back */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => (router.canGoBack() ? router.back() : router.replace(`/journey/${id}`))}
      >
        <Icon name="arrow-left" size={20} color={colors.accent} />
      </TouchableOpacity>

      {/* Top stage card */}
      <View style={[styles.topCard, { top: insets.top + 8 }]}>
        <Text style={styles.topEyebrow}>
          DAY {dayNum} OF {walkStages.length}
        </Text>
        <Text style={styles.topTitle} numberOfLines={1}>
          {routeLabel}
        </Text>
        <Text style={styles.topMeta}>
          {formatKm(currentStage.distanceM)} · ↑{formatElevationM(currentStage.ascentM)}
        </Text>
      </View>

      {/* Bottom card */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + spacing[6] }]}>
        <View style={styles.stats}>
          <Stat value={formatKm(currentStage.distanceM)} label="distance" />
          <View style={styles.statDivider} />
          <Stat value={`↑${formatElevationM(currentStage.ascentM)}`} label="ascent" />
          <View style={styles.statDivider} />
          <Stat value={`${dayNum} / ${walkStages.length}`} label="day" />
        </View>

        {(nextWater || nextRefuge) && (
          <View style={styles.guide}>
            {nextWater && (
              <TouchableOpacity
                style={styles.poiRow}
                onPress={() => router.push(`/poi/water/${nextWater.poi.id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.poiDot, { backgroundColor: colors.marker.water }]} />
                <Text style={styles.poiText} numberOfLines={1}>
                  Next water · <Text style={styles.poiName}>{nextWater.poi.name}</Text>
                </Text>
                <Text style={styles.poiDist}>{formatKm(nextWater.distanceM, 1)}</Text>
              </TouchableOpacity>
            )}
            {nextRefuge && (
              <TouchableOpacity
                style={styles.poiRow}
                onPress={() => router.push(`/poi/accommodation/${nextRefuge.poi.id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.poiDot, { backgroundColor: colors.marker.refuge }]} />
                <Text style={styles.poiText} numberOfLines={1}>
                  Next refuge · <Text style={styles.poiName}>{nextRefuge.poi.name}</Text>
                </Text>
                <Text style={styles.poiDist}>{formatKm(nextRefuge.distanceM, 1)}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.btnGhost}
            onPress={() => router.push(`/journey/${id}`)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnGhostLabel}>Itinerary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={isPaused ? resumeNavigation : () => setSheetOpen(true)}
            disabled={progress.isPending}
            activeOpacity={0.85}
          >
            <Icon name={isPaused ? 'play' : 'pause'} size={16} color={colors.text.onAccent} />
            <Text style={styles.btnPrimaryLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <PauseSheet
        visible={sheetOpen}
        dayNum={dayNum}
        routeLabel={routeLabel}
        pending={progress.isPending}
        onPauseNavigation={pauseNavigation}
        onStopForToday={stopForToday}
        onFinishStage={finishStage}
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

  topCard: {
    position: 'absolute',
    left: 68,
    right: spacing[8],
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    ...SHADOW,
  },
  topEyebrow: { ...type.label, color: colors.text.secondary },
  topTitle: { ...type.cardTitle, color: colors.text.primary, paddingTop: spacing[1] },
  topMeta: { ...type.meta, color: colors.text.secondary, paddingTop: spacing[1] },

  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing[6],
    paddingHorizontal: layout.screenPadding,
    gap: spacing[6],
    ...SHADOW,
  },
  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: spacing[1] },
  statValue: { ...type.statValue, color: colors.text.primary },
  statLabel: { ...type.meta, color: colors.text.secondary },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border.default },

  guide: { gap: spacing[3] },
  poiRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  poiDot: { width: 8, height: 8, borderRadius: 4 },
  poiText: { ...type.body, color: colors.text.secondary, flex: 1 },
  poiName: { fontFamily: type.cardTitle.fontFamily, color: colors.text.primary },
  poiDist: { ...type.meta, fontFamily: type.cardTitle.fontFamily, color: colors.text.primary },

  buttons: { flexDirection: 'row', gap: spacing[4] },
  btnGhost: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostLabel: { ...type.cardTitle, color: colors.text.primary },
  btnPrimary: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryLabel: { ...type.cardTitle, color: colors.text.onAccent },
});
