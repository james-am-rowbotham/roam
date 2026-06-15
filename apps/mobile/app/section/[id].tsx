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
import { MapImages, MapView, SectionEndpoints, TrailBlaze, TrailLayer } from '../../components/map';
import { ElevationProfile, SummaryRow } from '../../components/trail';
import { Button, Icon, StatPill } from '../../components/ui';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../../config/map';
import { geometryBbox, geometryViewport } from '../../lib/geo';
import { useSection, useTrails } from '../../lib/hooks';
import { useJourneySetupStore } from '../../store/journeySetupStore';
import { useMapStore } from '../../store/mapStore';
import { colors, fonts, layout, radius, spacing, type } from '../../theme';

type Tab = 'overview' | 'guide';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text style={styles.statRowValue}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const setSectionFilter = useMapStore((s) => s.setSectionFilter);
  const initSetup = useJourneySetupStore((s) => s.init);
  const { data: trailsData } = useTrails();

  const { data: response, isLoading } = useSection(id);
  const section = response?.data;

  if (isLoading || !section || 'error' in section) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const sectionGeom = 'geometry' in section ? (section.geometry as Record<string, unknown>) : null;
  const sectionViewport = geometryViewport(sectionGeom);
  // The parent trail's painted waymark (§17.8), looked up via the section's route.
  const trailSymbol =
    trailsData?.data?.find((t) => t.routeId === section.routeId)?.waymark?.symbol ?? null;
  const trailColor = trailSymbol?.wayColor ?? colors.map.route;
  const blazeImage = trailSymbol ? `blaze-${symbolKey(trailSymbol)}` : undefined;
  const sectionBounds = sectionGeom ? (geometryBbox(sectionGeom) ?? undefined) : undefined;
  const distanceKm = section.distanceM ? (section.distanceM / 1000).toFixed(1) : '—';
  const ascentM = section.ascentM ? `+${Math.round(section.ascentM)} m` : '—';
  const descentM = section.descentM ? `−${Math.round(section.descentM)} m` : '—';
  const timeH = section.distanceM
    ? `${Math.round((section.distanceM / 1000 / 3) * 1.5)}–${Math.round((section.distanceM / 1000 / 2.5) * 1.5)} h`
    : '—';

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {section.imageUrl && (
            <Image
              source={{ uri: section.imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          )}
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="arrow-left" size={20} color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.heroLabel}>
            SECTION {section.orderIndex} OF {section.totalSections}
          </Text>
          <Text style={styles.heroName}>{section.name}</Text>
        </View>

        {/* Stat pills */}
        <View style={styles.stats}>
          <StatPill value={`${distanceKm} km`} label="Distance" />
          <View style={styles.divider} />
          <StatPill value={ascentM} label="Ascent" />
          <View style={styles.divider} />
          <StatPill value={timeH} label="Time" />
          <View style={styles.divider} />
          <StatPill value="Hard" label="Grade" />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['overview', 'guide'] as Tab[]).map((tab) => (
            <TouchableOpacity key={tab} style={styles.tab} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview */}
        {activeTab === 'overview' && (
          <View style={styles.content}>
            {section.description && <Text style={styles.description}>{section.description}</Text>}

            {/* Section map — tap to open full map centred on this section */}
            <TouchableOpacity
              style={styles.mapCard}
              activeOpacity={0.9}
              onPress={() => {
                const label = 'name' in section ? section.name : null;
                const chainageRange =
                  'startChainageM' in section &&
                  section.startChainageM != null &&
                  section.endChainageM != null
                    ? ([
                        Math.min(section.startChainageM, section.endChainageM),
                        Math.max(section.startChainageM, section.endChainageM),
                      ] as [number, number])
                    : null;
                const viewport = sectionViewport ?? {
                  center: MAP_DEFAULT_CENTER,
                  zoom: MAP_DEFAULT_ZOOM,
                };
                const geomCenter = sectionViewport?.center ?? null;
                const sectionId = 'id' in section ? section.id : 0;
                if (label && geomCenter && sectionGeom) {
                  setSectionFilter(
                    sectionId,
                    label,
                    geomCenter,
                    sectionGeom,
                    chainageRange,
                    viewport,
                  );
                }
                router.push('/(tabs)/map');
              }}
            >
              <MapView
                bounds={sectionBounds}
                center={sectionViewport?.center}
                zoom={sectionViewport?.zoom ?? 8}
                interactive={false}
              >
                <MapImages />
                {'geometry' in section && section.geometry && (
                  <>
                    <TrailLayer
                      id="section-preview"
                      geojson={{
                        type: 'Feature',
                        geometry: section.geometry as never,
                        properties: {},
                      }}
                      color={trailColor}
                      width={3}
                    />
                    {blazeImage && (
                      <TrailBlaze
                        id="section-preview-blaze"
                        geojson={{
                          type: 'Feature',
                          geometry: section.geometry as never,
                          properties: {},
                        }}
                        image={blazeImage}
                        centered
                      />
                    )}
                    <SectionEndpoints geom={sectionGeom} />
                  </>
                )}
              </MapView>
            </TouchableOpacity>

            {/* Elevation profile — the real sampled terrain for this section,
                with min/max + distance scale labels for reference */}
            <ElevationProfile
              data={(section.elevationProfile ?? []).map((p) => p.e)}
              mode="preview"
              height={72}
              scale
              distanceM={section.distanceM}
            />

            {/* Full stats */}
            <Text style={styles.fullStatsTitle}>Full stats</Text>
            <StatRow label="Distance" value={`${distanceKm} km`} />
            <StatRow label="Time" value={timeH} />
            <StatRow label="Ascent" value={ascentM} />
            <StatRow label="Descent" value={descentM} />
            <StatRow
              label="Start"
              value={`${Math.round((section.startChainageM ?? 0) / 1000)} km`}
            />
            <StatRow label="End" value={`${Math.round((section.endChainageM ?? 0) / 1000)} km`} />

            {/* On this section */}
            <View style={styles.summaryRows}>
              <SummaryRow
                color={colors.marker.refuge}
                icon="stay"
                title="Stay"
                body="Check refuges along this section — book ahead in season."
              />
              <SummaryRow
                color={colors.marker.water}
                icon="water"
                title="Water"
                body="Check water sources along this section before setting off."
              />
              <SummaryRow
                color={colors.marker.food}
                icon="food"
                title="Food"
                body="Carry food for the full section unless refuges are confirmed open."
              />
            </View>
          </View>
        )}

        {activeTab === 'guide' && (
          <View style={styles.content}>
            <Text style={styles.description}>
              Guide content will appear here once the Guide is wired up.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* CTA — open the setup flow scoped to start at this section */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + layout.ctaBarPadding }]}>
        <Button
          label="Start from here"
          onPress={() => {
            const trails = Array.isArray(trailsData?.data) ? trailsData.data : [];
            const trail = trails.find((t) => t.routeId === section.routeId);
            if (!trail) return;
            initSetup({
              routeId: section.routeId,
              trailId: trail.id,
              trailRef: trail.ref ?? trail.name,
              scope: 'section',
              startSectionId: section.id,
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
    height: 200,
    backgroundColor: colors.bg.subtle,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[8],
    paddingBottom: spacing[8],
  },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay.darkStrong },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 38,
    backgroundColor: colors.overlay.frosted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    ...type.label,
    color: colors.overlay.onImageMuted,
    marginBottom: 4,
  },
  heroName: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.overlay.onImage,
    lineHeight: 28,
    letterSpacing: -0.22,
  },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.default,
  },
  divider: { width: 0.5, height: 28, backgroundColor: colors.border.default },

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

  content: { padding: spacing[8], gap: spacing[6] },
  description: { ...type.body, color: colors.text.primary, lineHeight: 22 },

  mapCard: {
    height: 160,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.border.default,
  },

  fullStatsTitle: { ...type.sectionHeader, color: colors.text.primary },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.default,
  },
  statRowLabel: { ...type.body, color: colors.text.secondary, flex: 1 },
  statRowValue: {
    ...type.cardTitle,
    fontFamily: fonts.monoMedium,
    fontSize: 14,
    letterSpacing: -0.07,
    color: colors.text.primary,
  },

  summaryRows: { gap: spacing[6] },

  ctaWrap: { padding: layout.ctaBarPadding },
});
