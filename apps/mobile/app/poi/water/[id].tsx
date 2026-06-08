import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, StatPill } from '../../../components/ui';
import { useWaterSource } from '../../../lib/hooks';
import { colors, fonts, radius, spacing, type } from '../../../theme';

// ---------------------------------------------------------------------------
// Trust helpers
// ---------------------------------------------------------------------------

function trustStatus(confidence: number, seasonal: boolean) {
  if (confidence >= 0.75) return { label: 'Reliable — flowing', scheme: colors.status.success };
  if (confidence >= 0.5) return { label: 'Likely flowing', scheme: colors.status.warn };
  return { label: seasonal ? 'Seasonal — check' : 'Unconfirmed', scheme: colors.status.danger };
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Icon name={icon as never} size={16} color={colors.text.secondary} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function WaterSourceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: response, isLoading } = useWaterSource(id);
  const poi = response?.data;

  if (isLoading || !poi) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const confidence = poi.confidence ?? 0;
  const trust = trustStatus(confidence, poi.seasonal);
  const chainageKm = poi.chainageM ? `${Math.round(poi.chainageM / 1000)} km` : '—';

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="arrow-left" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Type badge + name */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <View style={[styles.badgeDot, { backgroundColor: colors.marker.water }]}>
                <Icon name="water" size={12} color={colors.overlay.onImage} />
              </View>
              <Text style={[styles.badgeLabel, { color: colors.marker.water }]}>WATER SOURCE</Text>
            </View>
            <Text style={styles.name}>{poi.name ?? 'Unnamed water source'}</Text>
            <Text style={styles.subtitle}>On the GR11 · {chainageKm} from start</Text>
          </View>

          {/* Reliability card */}
          <View style={[styles.reliabilityCard, { backgroundColor: trust.scheme.bg }]}>
            <View style={styles.reliabilityTop}>
              <View style={styles.reliabilityState}>
                <View style={[styles.reliabilityDot, { backgroundColor: trust.scheme.text }]} />
                <Text style={[styles.reliabilityLabel, { color: trust.scheme.text }]}>
                  {trust.label}
                </Text>
              </View>
              <Text style={styles.reliabilityConfidence}>
                {Math.round(confidence * 100)}% confidence
              </Text>
            </View>
            <Text style={styles.reliabilityMeta}>
              {poi.reportCount > 0
                ? `Based on ${poi.reportCount} report${poi.reportCount !== 1 ? 's' : ''}`
                : 'No reports yet — OSM data'}
            </Text>
            {poi.lastConfirmedAt && (
              <Text style={styles.reliabilityMeta}>
                Last confirmed{' '}
                {new Date(poi.lastConfirmedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            )}
          </View>

          {/* Stat pills */}
          <View style={styles.stats}>
            <StatPill value={chainageKm} label="On trail" />
            <View style={styles.divider} />
            <StatPill value={poi.seasonal ? 'Seasonal' : 'Year-round'} label="Availability" />
            <View style={styles.divider} />
            <StatPill value="0 m" label="Detour" />
          </View>

          {/* Details */}
          <Text style={styles.sectionTitle}>Details</Text>
          <DetailRow
            icon="calendar"
            label="Availability"
            value={poi.seasonal ? 'Seasonal' : 'Year-round'}
          />
          <DetailRow icon="water" label="Source" value="Natural spring" />
          <DetailRow icon="search" label="From trail" value="On route · 0 m detour" />

          {/* Report buttons */}
          <Text style={styles.sectionTitle}>Report condition</Text>
          <View style={styles.reportRow}>
            {(['Flowing', 'Trickle', 'Dry'] as const).map((state) => (
              <TouchableOpacity key={state} style={styles.reportBtn} activeOpacity={0.8}>
                <Text style={styles.reportBtnText}>{state}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
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
  },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay.dark },
  backBtn: {
    position: 'absolute',
    top: 14,
    left: 12,
    width: 38,
    height: 38,
    borderRadius: 38,
    backgroundColor: colors.overlay.frosted,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },

  content: { padding: spacing[8], gap: spacing[6] },

  header: { gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  badgeDot: {
    width: 24,
    height: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.overlay.onImage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: { fontFamily: fonts.semiBold, fontSize: 11, letterSpacing: 0.8 },
  name: { fontFamily: fonts.semiBold, fontSize: 23, color: colors.text.primary, lineHeight: 28 },
  subtitle: { ...type.meta, color: colors.text.secondary },

  reliabilityCard: { borderRadius: radius.lg, padding: spacing[6], gap: 4 },
  reliabilityTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reliabilityState: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  reliabilityDot: { width: 8, height: 8, borderRadius: 8 },
  reliabilityLabel: { ...type.cardTitle },
  reliabilityConfidence: { ...type.meta, color: colors.text.secondary },
  reliabilityMeta: { ...type.meta, color: colors.text.secondary },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.border.default,
    paddingVertical: 14,
  },
  divider: { width: 0.5, height: 30, backgroundColor: colors.border.default },

  sectionTitle: { ...type.sectionHeader, color: colors.text.primary },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.default,
    gap: spacing[6],
  },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { ...type.body, color: colors.text.primary, flex: 1 },
  detailValue: { ...type.meta, color: colors.text.secondary },

  reportRow: { flexDirection: 'row', gap: spacing[4] },
  reportBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtnText: { ...type.detailTab, color: colors.text.primary },
});
