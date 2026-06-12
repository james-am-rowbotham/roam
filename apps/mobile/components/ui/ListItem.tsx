import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, type } from '../../theme';
import { Icon, type IconName } from './Icon';

// Settings-style row — mirrors the Figma "List Item" set (node 631:122).
// Variants: Detail (value + chevron) and Toggle (real on/off states).
// 48pt min height, 12V padding, 12 gap, hairline bottom border.
// Consumers: Profile rows, Journey Settings, the Wi-Fi-only download row.

function Toggle({ on }: { on: boolean }) {
  return (
    <View style={[styles.track, on ? styles.trackOn : styles.trackOff]}>
      <View style={[styles.thumb, on && styles.thumbOn]} />
    </View>
  );
}

interface BaseProps {
  title: string;
  icon?: IconName;
  /** Hide the leading icon slot (rows in icon-less groups). */
  showIcon?: boolean;
  onPress?: () => void;
}

interface DetailProps extends BaseProps {
  trailing?: 'detail';
  value?: string;
}

interface ToggleProps extends BaseProps {
  trailing: 'toggle';
  value: boolean;
}

type Props = DetailProps | ToggleProps;

export function ListItem(props: Props) {
  const { title, icon, showIcon = true, onPress } = props;
  const isToggle = props.trailing === 'toggle';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      {showIcon && icon && <Icon name={icon} size={20} color={colors.text.primary} />}
      <Text style={styles.title}>{title}</Text>
      {isToggle ? (
        <Toggle on={props.value} />
      ) : (
        <>
          {props.value != null && <Text style={styles.value}>{props.value}</Text>}
          <Icon name="chevron-right" size={16} color={colors.text.secondary} />
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    minHeight: 48,
    paddingVertical: spacing[6],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  title: { ...type.bodyStrong, color: colors.text.primary, flex: 1 },
  value: { ...type.dataS, color: colors.text.secondary },

  // Toggle — 40×24 pill per the Figma master.
  track: {
    width: 40,
    height: 24,
    borderRadius: radius.full,
    padding: 2,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: colors.accent },
  trackOff: {
    backgroundColor: colors.bg.input,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
  },
  thumbOn: { alignSelf: 'flex-end' },
});
