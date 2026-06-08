import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { TrailListItem } from '../../lib/hooks';
import { colors, radius, spacing, type } from '../../theme';

interface Props {
  trail: TrailListItem;
  onPress: () => void;
}

export function TrailCard({ trail, onPress }: Props) {
  const km = trail.distanceM ? Math.round(trail.distanceM / 1000) : null;
  const subtitle = [km ? `${km} km` : null, trail.country].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageWrap}>
        {trail.imageUrl ? (
          <Image source={{ uri: trail.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {trail.ref ?? trail.name}
      </Text>
      <Text style={styles.sub} numberOfLines={1}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: 150, gap: spacing[2] },
  imageWrap: { height: 173, borderRadius: radius.sm, overflow: 'hidden', marginBottom: spacing[1] },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, backgroundColor: colors.bg.subtle },
  name: { ...type.cardTitle, color: colors.text.primary },
  sub: { ...type.meta, color: colors.text.secondary },
});
