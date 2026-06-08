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
import { useSection } from '../../lib/hooks';
import { colors, fonts, radius, spacing, type } from '../../theme';

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

function SummaryRow({
  color,
  icon,
  title,
  body,
}: { color: string; icon: IconName; title: string; body: string }) {
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

export default function SectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: response, isLoading } = useSection(id);
  const section = response?.data;

  if (isLoading || !section) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

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

            {/* Elevation profile placeholder */}
            <View style={styles.elevationCard}>
              <Text style={styles.elevationLabel}>Elevation profile</Text>
            </View>

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
                icon="home"
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
                color={colors.trail.local}
                icon="food"
                title="Food"
                body="Carry food for the full stage unless refuges are confirmed open."
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

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <Button label="Start from here" />
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
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay.darkStrong },
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
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroName: {
    fontFamily: fonts.semiBold,
    fontSize: 22,
    color: colors.overlay.onImage,
    lineHeight: 28,
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

  elevationCard: {
    height: 116,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elevationLabel: { ...type.meta, color: colors.text.secondary },

  fullStatsTitle: { ...type.sectionHeader, color: colors.text.primary },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.default,
  },
  statRowLabel: { ...type.body, color: colors.text.secondary, flex: 1 },
  statRowValue: { ...type.cardTitle, color: colors.text.primary },

  summaryRows: { gap: spacing[6] },
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

  ctaWrap: { padding: spacing[8], paddingBottom: spacing[6] },
});
