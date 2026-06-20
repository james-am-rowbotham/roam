import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, type } from '../../theme';
import { Icon, type IconName } from '../ui';

// Search result row (Figma 02 · Search — `51:117`): a 36px tile (hero image, or the
// category icon as a fallback), name + meta, and a hairline type tag on the right.
// No chevron — the tag is the trailing element. Reused for every grouped result.
interface Props {
  title: string;
  meta?: string;
  tag: string; // "Trail" / "Peak" / "Section" / "Stage"
  mediaUri?: string;
  icon: IconName; // fallback glyph when there's no hero image
  onPress?: () => void;
}

export function SearchResultRow({ title, meta, tag, mediaUri, icon, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.tile}>
        {mediaUri ? (
          <Image source={{ uri: mediaUri }} style={styles.tileImg} />
        ) : (
          <Icon name={icon} size={18} color={colors.text.primary} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{tag}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileImg: { width: '100%', height: '100%' },
  info: { flex: 1, gap: 1 },
  title: { ...type.cardTitle, color: colors.text.primary },
  meta: { ...type.meta, color: colors.text.secondary },
  tag: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: 3,
  },
  tagText: { ...type.meta, color: colors.text.secondary },
});
