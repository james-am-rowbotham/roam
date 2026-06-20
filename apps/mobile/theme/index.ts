// Design tokens for the mobile app. Colours, the palette, the radius and
// spacing scales now come from the shared @roam/tokens package — one source for
// web + mobile (§16). This file adds the platform-specific pieces RN needs:
// the loaded font-family names, the type styles that bind them, RN shadow props
// and layout helpers.

import { colors, palette, radius, spacing } from '@roam/tokens';
import type { Theme } from './types';

// Re-export the shared value tokens so existing `@/theme` imports keep working.
export { colors, palette, radius, spacing };

export const fonts: Theme['fonts'] = {
  display: 'BricolageGrotesque_600SemiBold',
  displayBold: 'BricolageGrotesque_700Bold',
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semiBold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
};

// Digits and ALL-CAPS are instrument readouts (mono); headings are Bricolage;
// anything read as language is Hanken. Mono styles run one size below the
// styles they replace — deliberate, do not bump them back up.
export const type: Theme['type'] = {
  title: { fontFamily: fonts.display, fontSize: 17, lineHeight: 24, letterSpacing: -0.085 },
  sectionHeader: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24, letterSpacing: -0.09 },
  cardTitle: { fontFamily: fonts.display, fontSize: 15, lineHeight: 20 },
  statValue: { fontFamily: fonts.monoMedium, fontSize: 16, lineHeight: 22, letterSpacing: -0.08 },
  bodyLarge: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.monoMedium, fontSize: 9.5, lineHeight: 14, letterSpacing: 0.19 },
  tab: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14 },
  bodyStrong: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 18 },
  dataS: { fontFamily: fonts.monoMedium, fontSize: 12, lineHeight: 16 },
  dataMeta: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16, letterSpacing: 0.12 },
  detailTab: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 18 },
};

export const theme: Theme = { colors, fonts, type };

export type { Theme, ThemeColors, ThemeFonts, ThemeType, TypeStyle } from './types';

// Shadows — RN shadow props for elements floating over maps/photos.
// Figma: 0 2 6 rgba(38,33,26,0.07).
export const shadows = {
  surface: {
    shadowColor: '#26211A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

// Semantic spacing — use these for layout decisions, not raw spacing values.
// screenPadding: horizontal padding for screen content
// sectionGap: vertical gap between major sections on a screen
// contentPaddingBottom: bottom padding on ScrollViews to clear the tab bar + safe area
export const layout = {
  screenPadding: spacing[8], // 16
  sectionGap: 28, // breathing room between content sections
  contentPaddingBottom: 32, // base bottom padding (add insets.bottom on top)
  ctaBarPadding: spacing[8], // padding around a fixed bottom CTA bar; add insets.bottom on the bottom edge
} as const;
