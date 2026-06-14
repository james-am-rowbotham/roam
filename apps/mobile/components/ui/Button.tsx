import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '../../theme';
import { Icon, type IconName } from './Icon';

// The Button component mirrors the Figma "Button" set (node 446:152):
// Variant (solid | outline) × Size (sm | md | lg), plus tone=danger for the
// solid destructive button. Ghost/Text variants are deleted from the system —
// use a plain pressable text styled meta/bodyStrong instead.
// Labels: Small is Hanken SemiBold 13; Medium/Large are Bricolage 15/16 —
// per the Figma masters (the transition doc's "always bodyStrong" lost).
export type ButtonTone = 'default' | 'danger';
export type ButtonVariant = 'solid' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface SizeSpec {
  paddingH: number;
  paddingV: number;
  borderRadius: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  icon: number;
  gap: number;
}

const SIZES: Record<ButtonSize, SizeSpec> = {
  sm: {
    paddingH: 14,
    paddingV: 9,
    borderRadius: radius.lg,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
    icon: 16,
    gap: 6,
  },
  md: {
    paddingH: 18,
    paddingV: 12,
    borderRadius: radius.lg,
    fontFamily: fonts.display,
    fontSize: 15,
    lineHeight: 20,
    icon: 18,
    gap: 8,
  },
  lg: {
    paddingH: 22,
    paddingV: 15,
    borderRadius: 10,
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.08,
    icon: 20,
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
  switch (variant) {
    case 'solid':
      return {
        // Danger solid fills with brand blaze-red per the Figma master.
        bg: danger ? colors.brand.blazeRed : colors.accent,
        label: colors.text.onAccent,
      };
    case 'outline':
      return {
        bg: colors.bg.surface,
        label: danger ? colors.status.danger.text : colors.text.primary,
        borderColor: danger ? colors.status.danger.text : colors.border.default,
        borderWidth: 1,
      };
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
  pending?: boolean; // show a spinner and disable the button, but keep the label (e.g. "Submitting...")
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
  pending,
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
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    color: surface.label,
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        container,
        { gap: s.gap },
        disabled && styles.disabled,
        pending && !disabled && styles.pending,
      ]}
      onPress={onPress}
      disabled={disabled || pending}
      activeOpacity={0.85}
    >
      {pending ? (
        <ActivityIndicator size="small" color={surface.label} style={{ width: s.icon, height: s.icon }} />
      ) : (
        icon && <Icon name={icon} size={s.icon} color={surface.label} />
      )}
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
  pending: { opacity: 0.7 },
});
