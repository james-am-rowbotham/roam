import { StyleSheet, TouchableOpacity } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors, shadows } from '../../theme';
import { Icon, type IconName } from './Icon';

// Circular icon button — mirrors the Figma "IconButton" set (node 303:113).
// Two styles: `surface` (md 34 / lg 44) floats over maps and photos — surface
// fill, hairline border and a soft shadow (do not remove the shadow);
// `subtle` (md) sits inline on paper — input fill, no border or shadow.
export type IconButtonStyle = 'surface' | 'subtle';
export type IconButtonSize = 'md' | 'lg';

const SIZES: Record<IconButtonSize, { box: number; icon: number }> = {
  md: { box: 34, icon: 18 },
  lg: { box: 44, icon: 22 },
};

interface Props {
  icon: IconName;
  onPress?: () => void;
  style?: IconButtonStyle;
  size?: IconButtonSize;
  /** Icon colour (defaults to primary text). */
  color?: string;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onPress,
  style = 'surface',
  size = 'md',
  color = colors.text.primary,
  disabled,
}: Props) {
  const s = SIZES[size];
  const surface = style === 'surface';
  const container: ViewStyle = {
    width: s.box,
    height: s.box,
    borderRadius: s.box / 2,
    backgroundColor: surface ? colors.bg.surface : colors.bg.input,
    borderColor: surface ? colors.border.default : undefined,
    borderWidth: surface ? 1 : undefined,
    ...(surface ? shadows.surface : null),
  };
  return (
    <TouchableOpacity
      style={[styles.base, container, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon name={icon} size={s.icon} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
});
