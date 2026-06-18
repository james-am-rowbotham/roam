import { Image, StyleSheet, Text, View } from 'react-native';
import { mediaFor } from '../../lib/contentRepo';
import { colors, spacing, type } from '../../theme';

// Editorial hero image (§21.4) — fills its parent hero, with a dark scrim so overlaid
// title/kicker text stays legible, and a small mandatory attribution line (license gate).
// Renders nothing when the media id has no resolved asset (charcoal hero shows through).
export function HeroMedia({ mediaId }: { mediaId?: string }) {
  const m = mediaFor(mediaId);
  if (!m) return null;
  return (
    <>
      <Image source={{ uri: m.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />
      <Text style={styles.attribution} numberOfLines={1}>
        {m.attribution}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: colors.overlay.darkStrong },
  attribution: {
    position: 'absolute',
    right: spacing[3],
    top: spacing[2],
    ...type.label,
    color: colors.overlay.onImageMuted,
  },
});
