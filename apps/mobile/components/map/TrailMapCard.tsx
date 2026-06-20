import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, type } from '../../theme';

// Map trail card (Figma 03 Map · 141:672) — a cover image, the trail name, and a one-line
// stat summary, anchored on the trail in the all-trails view. Mirrors the web MapTrailCard;
// tapping it focuses the trail on the map.
interface Props {
  title: string;
  meta: string; // "847 km · 46 stages"
  image?: string;
  onPress?: () => void;
}

export function TrailMapCard({ title, meta, image, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback]} />
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    overflow: 'hidden',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  image: { width: '100%', height: 80 },
  imageFallback: { backgroundColor: colors.bg.subtle },
  body: { padding: spacing[5], gap: spacing[1] },
  title: { ...type.cardTitle, color: colors.text.primary },
  meta: { ...type.dataMeta, color: colors.text.secondary },
});
