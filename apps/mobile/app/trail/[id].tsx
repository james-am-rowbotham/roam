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
import { Button, Icon, StatPill } from '../../components/ui';
import type { IconName } from '../../components/ui';
import { useTrail, useTrailSections } from '../../lib/hooks';
import { colors, fonts, radius, spacing, type } from '../../theme';

type Tab = 'overview' | 'sections';

function SummaryRow({
  color,
  icon,
  title,
  body,
}: {
  color: string;
  icon: IconName;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={18} color={colors.overlay.onImage} />
      </View>
      <View style={styles.summaryText}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={styles.summaryBody}>{body}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function TrailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: trailResponse, isLoading } = useTrail(id);
  const trail = trailResponse?.data?.properties;

  const { data: sectionsResponse } = useTrailSections(id);
  const sections = sectionsResponse?.data ?? [];

  if (isLoading || !trail) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

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

            {/* Map thumbnail placeholder */}
            <View style={styles.mapThumb} />

            {/* ON THIS TRAIL */}
            <Text style={styles.onTrailLabel}>ON THIS TRAIL</Text>
            <SummaryRow
              color={colors.marker.refuge}
              icon="home"
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
              color={colors.trail.local}
              icon="food"
              title="Food"
              body="Resupply in valley towns every 3–5 days; most refuges serve dinner."
            />
          </View>
        )}

        {activeTab === 'sections' && (
          <View style={styles.tabContent}>
            {sections.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.sectionRow}
                onPress={() => router.push(`/section/${s.id}`)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionName}>{s.name}</Text>
                  <Text style={styles.sectionMeta}>
                    {Math.round((s.startChainageM ?? 0) / 1000)}–
                    {Math.round((s.endChainageM ?? 0) / 1000)} km
                  </Text>
                  {s.description ? <Text style={styles.sectionDesc}>{s.description}</Text> : null}
                </View>
                <Icon name="chevron-right" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <Button label="Start journey" />
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
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay.dark },
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
    fontFamily: fonts.semiBold,
    fontSize: 26,
    color: colors.overlay.onImage,
    lineHeight: 32,
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
    height: 80,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.subtle,
    borderWidth: 0.5,
    borderColor: colors.border.default,
  },

  onTrailLabel: {
    ...type.label,
    color: colors.text.secondary,
    letterSpacing: 0.6,
    marginTop: spacing[2],
  },
  summaryRow: { flexDirection: 'row', gap: spacing[6], alignItems: 'flex-start' },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1, gap: 2 },
  summaryTitle: { ...type.cardTitle, color: colors.text.primary },
  summaryBody: { ...type.meta, color: colors.text.secondary, lineHeight: 18 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.default,
    gap: spacing[4],
  },
  sectionName: { ...type.cardTitle, color: colors.text.primary },
  sectionMeta: { ...type.meta, color: colors.text.secondary },
  sectionDesc: { ...type.meta, color: colors.text.secondary, marginTop: 2 },

  ctaWrap: { padding: spacing[8], paddingBottom: spacing[6] },
});
