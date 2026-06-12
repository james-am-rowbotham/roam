// Design tokens — mirrors the Figma variables exactly (Foundations, node 28:2).
// Import this wherever you need colours, spacing, radius or type styles.
//
// The refreshed design system: warm neutrals, single green accent,
// Bricolage Grotesque (display) / Hanken Grotesk (body, UI) / Geist Mono
// (numerals, stats, uppercase micro-labels). Spacing, radius and layout are
// unchanged from the previous design — the refresh deliberately keeps them.

import type { Theme } from './types';

// Primitives. Components never consume these — semantic tokens only.
export const palette = {
  stone50: '#FAF7F1',
  stone0: '#FFFEFB',
  ink700: '#26231E',
  ink500: '#6F6A60',
  white: '#FFFFFF',
  sand200: '#E8E4D8',
  sage200: '#D4E6C3',
  amber100: '#FAEEDA',
  amber700: '#854F0B',
  red100: '#FCEBEB',
  red700: '#A32D2D',
  green100: '#E2EAE0',
  green700: '#3D5A3F',
  blazeRed: '#D63A22',
  blazeCream: '#FAF4E8',
} as const;

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

// Progress/active UI is green — the blue "info" pair is deleted from the system.
const progress = { bg: palette.green100, text: palette.green700 };

export const colors: Theme['colors'] = {
  accent: palette.green700,

  bg: {
    app: palette.stone50,
    surface: palette.stone0,
    // True rgba, not flattened to hex — these composite over photos.
    subtle: 'rgba(58,47,30,0.04)',
    input: 'rgba(58,47,30,0.05)',
  },

  border: {
    default: 'rgba(58,51,40,0.13)',
  },

  text: {
    primary: palette.ink700,
    secondary: palette.ink500,
    onAccent: palette.white,
    tabActive: palette.ink500,
  },

  // Trail classification colors are functional wayfinding, not theme — unchanged.
  trail: {
    international: '#C74538',
    national: '#2E6EB0',
    gr: '#7D57C2',
    local: '#5C8C3D',
  },

  // POI marker palette. Markers never follow the accent: peaks render in
  // text.primary, junction nodes in surface fill + trail.local ring/number.
  marker: {
    water: '#4D7A8C',
    refuge: '#A0683C',
    viewpoint: '#58836B',
    historic: '#7C6E5C',
    food: '#6B8456',
  },

  status: {
    warn: { bg: palette.amber100, text: palette.amber700 },
    danger: { bg: palette.red100, text: palette.red700 },
    success: { bg: palette.green100, text: palette.green700 },
    progress,
    // Deprecated alias of `progress` — delete in the final migration commit.
    info: progress,
  },

  brand: { blazeRed: palette.blazeRed, blazeCream: palette.blazeCream },

  map: {
    base: palette.sand200,
    road: palette.white,
    green: palette.sage200,
    route: palette.ink700,
    water: '#AACBD8',
    contour: '#D8CFBE',
  },

  // Overlay tokens — used on hero images and frosted-glass elements
  overlay: {
    dark: 'rgba(28,24,20,0.35)', // hero image scrim
    darkStrong: 'rgba(28,24,20,0.45)', // section hero (shorter image, needs more contrast)
    frosted: 'rgba(255,254,251,0.92)', // back button on hero
    onImage: '#FFFFFF', // primary text on dark hero
    onImageMuted: 'rgba(255,255,255,0.85)', // secondary text on hero
  },
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

export const radius = {
  sm: 6,
  md: 7,
  lg: 8,
  xl: 12,
  full: 360,
} as const;

export const spacing = {
  1: 2,
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
  8: 16,
  12: 24,
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
