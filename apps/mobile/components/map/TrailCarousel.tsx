import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, type } from '../../theme';
import { Icon } from '../ui/Icon';

export interface CarouselItem {
  objectiveId: string;
  title: string;
  subtitle?: string;
  image?: string;
  difficulty?: string;
  statLine: string;
}

// Card height — drives the recenter button's offset so it sits just above the card.
export const TRAIL_CARD_HEIGHT = 112;

// A simple trail preview card pinned to the bottom of the map: a cover image with a
// difficulty badge, the trail name, and a one-line stat summary. Tapping it opens the guide;
// the ✕ (or tapping the map) dismisses it and unhighlights the trail.
interface Props {
  item: CarouselItem;
  onClose: () => void;
  onOpen: () => void;
}

export function TrailCarousel({ item, onClose, onOpen }: Props) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.imageWrap} onPress={onOpen} activeOpacity={0.9}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]} />
        )}
        {item.difficulty ? (
          <View style={styles.diffBadge}>
            <Text style={styles.diffText}>{item.difficulty}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity style={styles.body} onPress={onOpen} activeOpacity={0.8}>
        {item.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.stats} numberOfLines={1}>
          {item.statLine}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={8}>
        <Icon name="close" size={18} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    height: TRAIL_CARD_HEIGHT,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    overflow: 'hidden',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  imageWrap: { width: 104, height: '100%' },
  image: { width: '100%', height: '100%' },
  imageFallback: { backgroundColor: colors.bg.subtle },
  diffBadge: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    backgroundColor: colors.bg.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: 2,
  },
  diffText: { ...type.label, color: colors.text.primary },
  body: {
    flex: 1,
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[6],
    paddingRight: spacing[8],
    justifyContent: 'center',
    gap: 2,
  },
  subtitle: { ...type.dataMeta, color: colors.text.secondary },
  title: { ...type.cardTitle, color: colors.text.primary },
  stats: { ...type.dataMeta, color: colors.text.secondary },
  close: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    padding: spacing[1],
  },
});
