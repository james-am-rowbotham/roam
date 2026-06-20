import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, type } from '../../theme';

// Fixed card width for the Popular trails carousel (Figma 01 Home, node 45:35).
// A portrait image (150×173) over a two-line label — the next card peeks at the
// screen edge to signal the row scrolls.
export const TRAIL_CARD_WIDTH = 150;

export function TrailCard({
  title,
  subtitle,
  mediaUri,
  onPress,
}: {
  title: string;
  subtitle: string;
  mediaUri?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.image}>
        {mediaUri ? <Image source={{ uri: mediaUri }} style={styles.imageFill} /> : null}
      </View>
      <View style={styles.labels}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: TRAIL_CARD_WIDTH, gap: spacing[4] },
  image: {
    height: 173,
    borderRadius: radius.sm,
    backgroundColor: colors.map.green,
    overflow: 'hidden',
  },
  imageFill: { width: '100%', height: '100%' },
  labels: { gap: 2 },
  title: { ...type.cardTitle, color: colors.text.primary },
  subtitle: { ...type.meta, color: colors.text.secondary },
});
