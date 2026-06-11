import { StyleSheet, TouchableOpacity } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors, radius } from '../../theme';
import { Icon, type IconName } from './Icon';

// Circular icon button — mirrors the Figma "IconButton" set (node 303:113):
// Style (surface | subtle | ghost) × Size (sm 32 | md 40 | lg 48). The icon
// scales with the size (16 / 20 / 24). Colour is configurable for placement on
// light surfaces vs. accent contexts.
export type IconButtonStyle = 'surface' | 'subtle' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

const SIZES: Record<IconButtonSize, { box: number; icon: number }> = {
  sm: { box: 32, icon: 16 },
  md: { box: 40, icon: 20 },
  lg: { box: 48, icon: 24 },
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
  const bordered = style !== 'ghost';
  const container: ViewStyle = {
    width: s.box,
    height: s.box,
    borderRadius: s.box / 2,
    backgroundColor:
      style === 'subtle'
        ? colors.bg.subtle
        : style === 'surface'
          ? colors.bg.surface
          : 'transparent',
    borderColor: bordered ? colors.border.default : undefined,
    borderWidth: bordered ? 1 : undefined,
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
