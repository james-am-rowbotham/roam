import type { Stat } from '@roam/content';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, type } from '../../theme';
import { ElevationProfile } from '../trail/ElevationProfile';
import { Icon } from '../ui/Icon';
import { StatPills } from '../ui/StatPills';

export interface CarouselItem {
  objectiveId: string;
  title: string;
  subtitle?: string;
  stats: Stat[];
  elevation: number[];
  overview?: string;
}

// Slide-up trail preview over the map (mirrors the web TrailCarousel): the selected
// in-filter trail's stats, elevation profile, a short overview and a View-guide CTA.
// Prev/next cycle through the trails currently on the map.
interface Props {
  item: CarouselItem;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onViewGuide: () => void;
}

export function TrailCarousel({ item, index, total, onPrev, onNext, onViewGuide }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {total > 1 && (
          <TouchableOpacity onPress={onPrev} hitSlop={8} style={styles.arrow}>
            <Icon name="chevron-left" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        )}
        <View style={styles.titleCol}>
          {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        {total > 1 && (
          <>
            <Text style={styles.count}>{`${index + 1}/${total}`}</Text>
            <TouchableOpacity onPress={onNext} hitSlop={8} style={styles.arrow}>
              <Icon name="chevron-right" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <StatPills stats={item.stats} />

      {item.elevation.length > 1 && (
        <ElevationProfile data={item.elevation} mode="preview" height={48} />
      )}

      {item.overview ? (
        <Text style={styles.overview} numberOfLines={2}>
          {item.overview}
        </Text>
      ) : null}

      <TouchableOpacity onPress={onViewGuide} hitSlop={6}>
        <Text style={styles.viewGuide}>View guide →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    padding: spacing[6],
    gap: spacing[4],
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.subtle,
  },
  titleCol: { flex: 1, gap: 1 },
  subtitle: { ...type.dataMeta, color: colors.text.secondary },
  title: { ...type.title, fontSize: 19, color: colors.text.primary },
  count: { ...type.label, color: colors.text.secondary },
  overview: { ...type.meta, color: colors.text.secondary, lineHeight: 19 },
  viewGuide: { ...type.bodyStrong, color: colors.accent },
});
