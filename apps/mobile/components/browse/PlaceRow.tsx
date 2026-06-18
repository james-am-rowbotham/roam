import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, type } from '../../theme';
import { Icon } from '../ui/Icon';

// PlaceRow (Implementation Pass §7.3, Figma 993:166) — leading visual + name/meta +
// chevron. Reused as the trail Route's section row (image thumb) and the peak Route row
// (a grade badge in `leading`). When `leading` is omitted a media thumbnail is shown.
interface Props {
  title: string;
  meta?: string;
  description?: string;
  mediaUri?: string;
  leading?: ReactNode;
  onPress?: () => void;
}

export function PlaceRow({ title, meta, description, mediaUri, leading, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {leading ?? (
        <View style={styles.thumb}>
          {mediaUri ? <Image source={{ uri: mediaUri }} style={styles.thumbImg} /> : null}
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {meta && <Text style={styles.meta}>{meta}</Text>}
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Icon name="chevron-right" size={20} color={colors.text.secondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[6], paddingVertical: spacing[5] },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.subtle,
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  body: { flex: 1, gap: 2 },
  title: { ...type.cardTitle, color: colors.text.primary },
  meta: { ...type.dataMeta, color: colors.text.secondary },
  description: { ...type.meta, color: colors.text.secondary },
});
