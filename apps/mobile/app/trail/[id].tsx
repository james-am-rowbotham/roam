import { symbolKey } from '@roam/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapImages,
  MapView,
  SectionEndpoints,
  TrailBlaze,
  TrailLayer,
} from '../../components/map';
import { SummaryRow, TrailStageList } from '../../components/trail';
import { Button, Icon, RoamMark, StatPill } from '../../components/ui';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../../config/map';
import { geometryBbox } from '../../lib/geo';
import { useTrail, useTrailSections } from '../../lib/hooks';
import { useJourneySetupStore } from '../../store/journeySetupStore';
import { useMapStore } from '../../store/mapStore';
import { colors, fonts, layout, radius, spacing, type } from '../../theme';

type Tab = 'overview' | 'sections';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function TrailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: trailResponse, isLoading } = useTrail(id);
  const rawTrailData = trailResponse?.data;
  const trail = rawTrailData && 'properties' in rawTrailData ? rawTrailData.properties : null;
  const geojson = rawTrailData && 'type' in rawTrailData ? rawTrailData : null;
  const setTrailFilter = useMapStore((s) => s.setTrailFilter);
  const setViewport = useMapStore((s) => s.setViewport);

  const { data: sectionsResponse } = useTrailSections(id);
  const rawSections = sectionsResponse?.data;
  const sections = Array.isArray(rawSections) ? rawSections : [];

  const initSetup = useJourneySetupStore((s) => s.init);

  if (isLoading || !trail) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const trailColor = trail.waymark?.symbol?.wayColor ?? colors.map.route;
  const blazeImage = trail.waymark?.symbol ? `blaze-${symbolKey(trail.waymark.symbol)}` : undefined;
  const trailBounds = geojson ? (geometryBbox(geojson as never) ?? undefined) : undefined;
  const km = trail.distanceM ? Math.round(trail.distanceM / 1000) : '—';
  const elevK = trail.ascentM ? `${Math.round(trail.ascentM / 1000)}k` : '—';
  const days = trail.distanceM ? Math.round(trail.distanceM / 20_000) : '—';
  const subtitle = [trail.region, trail.country].filter(Boolean).join(' · ');

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {trail.imageUrl && (
            <Image
              source={{ uri: trail.imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          )}
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="arrow-left" size={20} color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.heroName}>{trail.ref ?? trail.name}</Text>
          {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
        </View>

        {/* Stat pills */}
        <View style={styles.stats}>
          <StatPill value={String(km)} label="km" />
          <View style={styles.divider} />
          <StatPill value={elevK} label="m elev." />
          <View style={styles.divider} />
          <StatPill value={String(days)} label="days" />
          <View style={styles.divider} />
          <StatPill value="Hard" label="difficulty" />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['overview', 'sections'] as Tab[]).map((tab) => (
            <TouchableOpacity key={tab} style={styles.tab} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            <Text style={styles.description}>{trail.description}</Text>

            {/* Map preview — tap to open full map */}
            <TouchableOpacity
              style={styles.mapThumb}
              activeOpacity={0.9}
              onPress={() => {
                const trailIdNum = Number(id);
                const trailLabel = trail.ref ?? trail.name ?? 'Trail';
                // Center label on the midpoint of the trail geometry
                const trailGeomCenter =
                  geojson && 'geometry' in geojson && geojson.geometry
                    ? (() => {
                        const g = geojson.geometry as Record<string, unknown>;
                        const coords = g.coordinates as unknown[][];
                        if (g.type === 'LineString' && Array.isArray(coords) && coords.length > 0) {
                          const mid = coords[Math.floor(coords.length / 2)] as [number, number];
                          return mid;
                        }
                        return null;
                      })()
                    : null;
                if (trailGeomCenter) {
                  setTrailFilter(trailIdNum, trailLabel, trailGeomCenter);
                }
                setViewport({ center: MAP_DEFAULT_CENTER, zoom: MAP_DEFAULT_ZOOM });
                router.push('/(tabs)/map');
              }}
            >
              <MapView bounds={trailBounds} zoom={6} interactive={false}>
                <MapImages />
                {geojson && (
                  <>
                    <TrailLayer
                      id="trail-preview"
                      geojson={geojson as never}
                      color={trailColor}
                      width={3}
                    />
                    {blazeImage && (
                      <TrailBlaze
                        id="trail-preview-blaze"
                        geojson={geojson as never}
                        image={blazeImage}
                        centered
                      />
                    )}
                    <SectionEndpoints geom={geojson as unknown as Record<string, unknown>} />
                  </>
                )}
              </MapView>
            </TouchableOpacity>

            {/* ON THIS TRAIL */}
            <Text style={styles.onTrailLabel}>ON THIS TRAIL</Text>
            <SummaryRow
              color={colors.marker.refuge}
              icon="stay"
              title="Stay"
              body={`${sections.length > 0 ? sections.length : '—'} sections · refuges and camping along the route`}
            />
            <SummaryRow
              color={colors.marker.water}
              icon="water"
              title="Water"
              body="Rivers, springs and refuge taps — rarely more than 2–3 hours apart."
            />
            <SummaryRow
              color={colors.marker.food}
              icon="food"
              title="Food"
              body="Resupply in valley towns every 3–5 days; most refuges serve dinner."
            />
          </View>
        )}

        {activeTab === 'sections' && (
          <View style={styles.sectionsTab}>
            <TrailStageList
              sections={sections}
              onPressStage={(sid) => router.push(`/section/${sid}`)}
            />
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + layout.ctaBarPadding }]}>
        <Button
          label="Start journey"
          onPress={() => {
            initSetup({
              routeId: trail.routeId,
              trailId: Number(id),
              trailRef: trail.ref ?? trail.name ?? 'Trail',
            });
            router.push('/journey/setup/scope');
          }}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: {
    height: 210,
    backgroundColor: colors.bg.subtle,
    justifyContent: 'flex-end',
    padding: spacing[8],
  },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay.dark },
  backBtn: {
    position: 'absolute',
    top: 51,
    left: 24,
    width: 38,
    height: 38,
    borderRadius: 38,
    backgroundColor: colors.overlay.frosted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.overlay.onImage,
    lineHeight: 32,
    letterSpacing: -0.26,
  },
  heroSub: { ...type.meta, color: colors.overlay.onImageMuted, marginTop: 2 },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.default,
  },
  divider: { width: 0.5, height: 32, backgroundColor: colors.border.default },

  tabs: {
    flexDirection: 'row',
    paddingLeft: spacing[6],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.default,
  },
  tab: { paddingHorizontal: spacing[4], paddingTop: spacing[6], alignItems: 'center', gap: 7 },
  tabLabel: { ...type.detailTab, color: colors.text.secondary },
  tabLabelActive: { color: colors.text.primary },
  tabUnderline: { height: 1.5, width: '100%', backgroundColor: colors.accent },

  tabContent: { padding: spacing[8], gap: spacing[6] },
  description: { ...type.body, color: colors.text.secondary, lineHeight: 22 },
  mapThumb: {
    height: 140,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.border.default,
  },

  onTrailLabel: {
    ...type.label,
    color: colors.text.secondary,
    letterSpacing: 0.6,
    marginTop: spacing[2],
  },
  // Sections tab uses the region-banded TrailStageList; only horizontal padding here.
  sectionsTab: { paddingHorizontal: spacing[8], paddingTop: spacing[2], paddingBottom: spacing[6] },

  ctaWrap: { padding: layout.ctaBarPadding },
});
