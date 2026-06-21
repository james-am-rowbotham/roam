import type { Stat } from '@roam/content';
import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

// The collapsed peek (just the trail name) — also used to offset the recenter button.
export const CAROUSEL_PEEK_HEIGHT = 56;

// Trail preview sheet that slides out of the bottom navigation. Collapsed, it shows just the
// trail name; swiping up (or tapping) expands it to the stats, elevation profile, a short
// overview and a View-guide CTA. Prev/next cycle the trails on the map; swiping the peek down
// dismisses it. Mirrors the web TrailCarousel.
interface Props {
  item: CarouselItem;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onViewGuide: () => void;
  onDismiss: () => void;
}

export function TrailCarousel({
  item,
  index,
  total,
  onPrev,
  onNext,
  onViewGuide,
  onDismiss,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  // Read fresh state/callbacks inside the (stable) pan handler.
  const live = useRef({ expanded, onDismiss });
  live.current = { expanded, onDismiss };
  const pan = useRef(
    PanResponder.create({
      // Claim only clear vertical drags, so the inner buttons still get taps.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -12) setExpanded(true);
        else if (g.dy > 12) live.current.expanded ? setExpanded(false) : live.current.onDismiss();
      },
    }),
  ).current;

  return (
    <View style={styles.sheet} {...pan.panHandlers}>
      <View style={styles.grip} />

      {expanded ? (
        <View style={styles.body}>
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
            <Text style={styles.overview} numberOfLines={4}>
              {item.overview}
            </Text>
          ) : null}

          <TouchableOpacity onPress={onViewGuide} hitSlop={6}>
            <Text style={styles.viewGuide}>View guide →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={() => setExpanded(true)} activeOpacity={0.7} style={styles.peek}>
          <Text style={styles.peekTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={styles.peekSub} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[8],
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
    gap: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
  },
  peek: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing[3],
    paddingBottom: spacing[1],
  },
  peekTitle: { ...type.title, fontSize: 17, color: colors.text.primary },
  peekSub: { ...type.dataMeta, color: colors.text.secondary },
  body: { gap: spacing[4] },
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
