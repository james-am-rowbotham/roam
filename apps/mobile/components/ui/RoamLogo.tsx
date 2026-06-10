import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../../theme';

type Variant = 'dark' | 'light';

/** The circular roam mark (dark = filled circle, light = outline-style on light). */
export function RoamMark({ size = 28, variant = 'dark' }: { size?: number; variant?: Variant }) {
  const circle = variant === 'dark' ? colors.accent : colors.bg.surface;
  const glyph = variant === 'dark' ? colors.bg.surface : colors.accent;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={32} cy={32} r={32} fill={circle} />
      <Path d="M14 44L25.4655 26.6L30.9531 30.9091L36.931 20L49 44H14Z" fill={glyph} />
    </Svg>
  );
}

/** Horizontal logo lockup: the mark followed by the "roam" wordmark. */
export function RoamLogo({ size = 28 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <RoamMark size={size} />
      <Text style={[styles.word, { fontSize: Math.round(size * 0.72) }]}>roam</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontFamily: fonts.bold, color: colors.text.primary, letterSpacing: -0.3 },
});
