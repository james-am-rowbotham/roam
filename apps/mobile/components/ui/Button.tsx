import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '../../theme';
import { Icon, type IconName } from './Icon';

// The Button component mirrors the Figma "Button" set (node 446:152):
// Tone (default | danger) × Variant (solid | outline | ghost | text) × Size
// (sm 36 | md 44 | lg 52). Sizes are padding-based so the height falls out of
// padding + line-height; radius and font scale per size.
export type ButtonTone = 'default' | 'danger';
export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface SizeSpec {
  paddingH: number;
  paddingV: number;
  borderRadius: number;
  fontSize: number;
  lineHeight: number;
  icon: number;
  gap: number;
}

const SIZES: Record<ButtonSize, SizeSpec> = {
  sm: {
    paddingH: 14,
    paddingV: 9,
    borderRadius: radius.lg,
    fontSize: 13,
    lineHeight: 18,
    icon: 14,
    gap: 6,
  },
  md: {
    paddingH: 18,
    paddingV: 12,
    borderRadius: radius.lg,
    fontSize: 15,
    lineHeight: 20,
    icon: 16,
    gap: 6,
  },
  lg: {
    paddingH: 22,
    paddingV: 15,
    borderRadius: 10,
    fontSize: 16,
    lineHeight: 22,
    icon: 18,
    gap: 8,
  },
};

interface Surface {
  bg: string;
  label: string;
  borderColor?: string;
  borderWidth?: number;
}

// Tone × variant → background, label colour and (optional) border.
function surfaceFor(tone: ButtonTone, variant: ButtonVariant): Surface {
  const danger = tone === 'danger';
  // Non-solid variants colour the label by tone; solid uses on-accent text.
  const toneText = danger ? colors.status.danger.text : colors.text.primary;
  switch (variant) {
    case 'solid':
      return {
        bg: danger ? colors.status.danger.text : colors.accent,
        label: colors.text.onAccent,
      };
    case 'outline':
      return {
        bg: colors.bg.surface,
        label: toneText,
        borderColor: danger ? colors.status.danger.text : colors.border.default,
        borderWidth: 1,
      };
    case 'ghost':
      return { bg: danger ? colors.status.danger.bg : colors.bg.subtle, label: toneText };
    case 'text':
      return { bg: 'transparent', label: toneText };
  }
}

interface Props {
  label: string;
  onPress?: () => void;
  tone?: ButtonTone;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional leading icon. */
  icon?: IconName;
  disabled?: boolean;
  /** flex: 1 — fill an equal share of a button row. */
  grow?: boolean;
  /** Stretch to the parent's width (full-width CTA). */
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  tone = 'default',
  variant = 'solid',
  size = 'md',
  icon,
  disabled,
  grow,
  fullWidth,
}: Props) {
  const s = SIZES[size];
  const surface = surfaceFor(tone, variant);

  const container: ViewStyle = {
    paddingHorizontal: s.paddingH,
    paddingVertical: s.paddingV,
    borderRadius: s.borderRadius,
    backgroundColor: surface.bg,
    borderColor: surface.borderColor,
    borderWidth: surface.borderWidth,
    ...(grow ? { flex: 1 } : null),
    ...(fullWidth ? { alignSelf: 'stretch' } : null),
  };
  const labelStyle: TextStyle = {
    fontFamily: fonts.semiBold,
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    color: surface.label,
  };

  return (
    <TouchableOpacity
      style={[styles.base, container, { gap: s.gap }, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      {icon && <Icon name={icon} size={s.icon} color={surface.label} />}
      <Text style={labelStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
});
