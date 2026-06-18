import type { Grade } from '@roam/content';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../../theme';

// Grade / difficulty badge (Implementation Pass §7.3, Figma 310:1038 route rows) — a
// rounded-square plate carrying the grade value in Geist Mono. Leads each peak Route
// row (`F` · `PD` · `F+`). The value is rendered as-is from `grade.value`, so the same
// badge serves any system (french-alpine, hiking-band, …) without an enum. Width grows
// for longer values; the square is the floor.
export function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.value}>{grade.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: fonts.monoMedium,
    fontSize: 15,
    letterSpacing: -0.08,
    color: colors.text.primary,
  },
});
