import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';

// The blaze brand mark — the red/cream GR waymark (Figma Logo Mark 274:1141).
// Two full-width bars: cream on top (hairline border), red below, pill ends.
// Box ratio w : 0.68w; each bar is 42% of the box height with a 16% gap.
//
// The blaze appears in exactly three product placements: (1) the logo
// lockup / app icon / splash (empty states count as this), (2) top-right of
// trail hero photos, (3) the chip beside "DAY n OF m" on the active journey
// sheet. It is never a bullet, divider, spinner or generic badge — a fourth
// placement requires a design decision first.
export function RoamMark({ width = 19 }: { width?: number }) {
  const height = width * 0.68;
  const bar = height * 0.42;
  return (
    <View style={{ width, height, justifyContent: 'space-between', alignItems: 'center' }}>
      <View style={[styles.bar, styles.cream, { height: bar, borderRadius: bar }]} />
      <View style={[styles.bar, styles.red, { height: bar, borderRadius: bar }]} />
    </View>
  );
}

// Horizontal lockup (Figma Logo 187:926): the mark beside the "roam"
// wordmark in Bricolage Bold, accent green. The mark matches the wordmark
// x-height (≈52% of font size); both vertically centered.
const LOCKUPS = {
  lg: { mark: 38, gap: 11, fontSize: 48, letterSpacing: -0.72 },
  sm: { mark: 19, gap: 6, fontSize: 24, letterSpacing: -0.36 },
} as const;

export function RoamLogo({ size = 'sm' }: { size?: keyof typeof LOCKUPS }) {
  const s = LOCKUPS[size];
  return (
    <View style={[styles.row, { gap: s.gap }]}>
      <RoamMark width={s.mark} />
      <Text
        style={[
          styles.word,
          { fontSize: s.fontSize, lineHeight: s.fontSize, letterSpacing: s.letterSpacing },
        ]}
      >
        roam
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  bar: { width: '100%' },
  cream: {
    backgroundColor: colors.brand.blazeCream,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.brand.blazeHairline,
  },
  red: { backgroundColor: colors.brand.blazeRed },
  word: { fontFamily: fonts.displayBold, color: colors.accent },
});
