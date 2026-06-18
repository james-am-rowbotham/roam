import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, type } from '../../theme';

// Discovery card (Implementation Pass §12.3, Figma 1138:*) — a wide landscape image
// with the name + a single line below: a character/terrain line for countries and
// regions, or `type · decisive number` for an objective. Placeholder image this pass.
export function DiscoveryCard({
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={styles.image}>
        {mediaUri ? <Image source={{ uri: mediaUri }} style={styles.imageFill} /> : null}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  image: {
    height: 100,
    borderRadius: radius.xl,
    backgroundColor: colors.map.green,
    overflow: 'hidden',
    marginBottom: spacing[3],
  },
  imageFill: { width: '100%', height: '100%' },
  title: { fontFamily: type.title.fontFamily, fontSize: 17, color: colors.text.primary },
  subtitle: { ...type.meta, color: colors.text.secondary, marginTop: 2 },
});
