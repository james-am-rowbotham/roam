import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { Icon } from '../../../components/ui';
import { useAccommodation } from '../../../lib/hooks';
import { colors, fonts, layout, radius, spacing, type } from '../../../theme';

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

export default function AccommodationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const insets = useSafeAreaInsets();
  const { data: response, isLoading } = useAccommodation(id);
  const poi = response?.data;

  if (isLoading || !poi || 'error' in poi) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const chainageKm = poi.chainageM ? `${Math.round(poi.chainageM / 1000)} km` : '—';
  const typeLabel = poi.type.charAt(0).toUpperCase() + poi.type.slice(1);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + layout.contentPaddingBottom }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {poi.imageUrl && (
            <Image
              source={{ uri: poi.imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          )}
          <View style={styles.heroOverlay} />
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => router.back()}
          >
            <Icon name="arrow-left" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Type badge + name */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <View style={[styles.badgeDot, { backgroundColor: colors.marker.refuge }]}>
                <Icon name="home" size={12} color={colors.overlay.onImage} />
              </View>
              <Text style={[styles.badgeLabel, { color: colors.marker.refuge }]}>
                {typeLabel.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{poi.name}</Text>
            <Text style={styles.subtitle}>On the GR11 · {chainageKm} from start</Text>
          </View>

          {/* Details */}
          <View>
            <Text style={styles.sectionTitle}>Details</Text>
            <View>
              <DetailRow icon="home" label="Type" value={typeLabel} />
              <DetailRow
                icon="calendar"
                label="Season"
                value={poi.seasonal ? 'Summer only' : 'Year-round'}
              />
              {poi.bookingUrl && (
                <DetailRow icon="search" label="Booking" value="Available online" />
              )}
            </View>
          </View>

          {/* Report */}
          <Text style={styles.sectionTitle}>Report condition</Text>
          <View style={styles.reportRow}>
            {(['Open', 'Full', 'Closed'] as const).map((state) => (
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { height: 200, backgroundColor: colors.bg.subtle, overflow: 'hidden' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay.dark },
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
