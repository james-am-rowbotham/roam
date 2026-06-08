// Design tokens — mirrors Figma variables exactly (§16 CLAUDE.md).
// Import this wherever you need colours, spacing, radius or type styles.

export const colors = {
  accent: '#494949',

  bg: {
    app: '#f7f5f4',
    surface: '#fdfcfc',
    subtle: '#f0edec',
    input: '#f5f3f2',
  },

  border: {
    default: '#e5e2e0',
  },

  text: {
    primary: '#494949',
    secondary: '#8a8580',
    onAccent: '#ffffff',
  },

  trail: {
    international: '#c74538',
    national: '#2e6eb0',
    gr: '#7d57c2',
    local: '#5c8c3d',
  },

  marker: {
    water: '#3385bf',
    refuge: '#cc7333',
    viewpoint: '#2e9e8f',
    historic: '#5c6b8f',
  },

  status: {
    warn: { bg: '#faeeda', text: '#854f0b' },
    danger: { bg: '#fcebeb', text: '#a32d2d' },
    info: { bg: '#e6f1fb', text: '#185fa5' },
    success: { bg: '#e3efd9', text: '#4a7a33' },
  },

  // Overlay tokens — used on hero images and frosted-glass elements
  overlay: {
    dark: 'rgba(0,0,0,0.35)', // hero image scrim
    darkStrong: 'rgba(0,0,0,0.4)', // section hero (shorter image, needs more contrast)
    frosted: 'rgba(255,255,255,0.92)', // back button on hero
    onImage: '#ffffff', // primary text on dark hero
    onImageMuted: 'rgba(255,255,255,0.85)', // secondary text on hero
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

// Typography — Inter font family.
// Register fonts in apps/mobile/app/_layout.tsx via expo-font.
// All font family references must go through this object — never hardcode strings.
export const fonts = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const type = {
  // §16 CLAUDE.md tokens
  title: { fontFamily: fonts.semiBold, fontSize: 17, lineHeight: 24 },
  sectionHeader: { fontFamily: fonts.semiBold, fontSize: 18, lineHeight: 24, letterSpacing: -0.36 },
  cardTitle: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 20 },
  statValue: { fontFamily: fonts.semiBold, fontSize: 17, lineHeight: 24 },
  bodyLarge: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semiBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.6 },
  tab: { fontFamily: fonts.semiBold, fontSize: 11, lineHeight: 16 },
  // Detail-screen tabs (Overview/Sections/Guide) — SemiBold 13px, present in Figma but not in §16
  detailTab: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 18 },
} as const;
