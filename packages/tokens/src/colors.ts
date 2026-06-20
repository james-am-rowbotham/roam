// Design-token colours — the single source of truth for the Roam palette,
// shared by the mobile app (RN theme object) and the web (generated CSS vars).
// Mirrors the Figma Foundations (node 28:2): warm neutrals, one green accent,
// no blue. Mobile imports these via apps/mobile/theme; web consumes the
// generated tokens.css (see ../scripts/build-css.ts).

export interface StatusPair {
  bg: string;
  text: string;
}

export interface ColorTokens {
  accent: string;
  bg: { app: string; surface: string; subtle: string; input: string };
  border: { default: string };
  text: { primary: string; secondary: string; onAccent: string; tabActive: string };
  /** Blaze palette — the three tokens every trail resolves into (§16/§17.8).
   *  Mirrors TRAIL_PALETTE in packages/core. No blue or purple in the canon. */
  trail: { gr: string; pr: string; sl: string };
  marker: { water: string; refuge: string; viewpoint: string; historic: string; food: string };
  status: { warn: StatusPair; danger: StatusPair; success: StatusPair; progress: StatusPair };
  brand: { blazeRed: string; blazeCream: string; blazeHairline: string };
  map: { base: string; road: string; green: string; route: string; water: string; contour: string };
  overlay: {
    dark: string;
    darkStrong: string;
    frosted: string;
    onImage: string;
    onImageMuted: string;
  };
}

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

// Progress/active UI is green — the blue "info" pair is deleted from the system.
const progress: StatusPair = { bg: palette.green100, text: palette.green700 };

export const colors: ColorTokens = {
  accent: palette.green700,

  bg: {
    app: palette.stone50,
    surface: palette.stone0,
    // True rgba, not flattened to hex — these composite over photos.
    subtle: 'rgba(58,47,30,0.04)',
    input: 'rgba(58,47,30,0.05)',
  },

  border: { default: 'rgba(58,51,40,0.13)' },

  text: {
    primary: palette.ink700,
    secondary: palette.ink500,
    onAccent: palette.white,
    tabActive: palette.ink500,
  },

  // Blaze palette — the canonical FEDME/FFRP waymark colours (§16/§17.8).
  // Mirrors TRAIL_PALETTE in packages/core; keep in sync.
  trail: {
    gr: '#C74538', // red — GR / long-distance
    pr: '#D9B53A', // yellow — PR / day route
    sl: '#5C8C3D', // green — SL / local
  },

  // POI marker palette. Markers never follow the accent.
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
  },

  brand: {
    blazeRed: palette.blazeRed,
    blazeCream: palette.blazeCream,
    // Hairline on the cream bar so it reads on light surfaces.
    blazeHairline: 'rgba(0,0,0,0.08)',
  },

  map: {
    base: palette.sand200,
    road: palette.white,
    green: palette.sage200,
    route: palette.ink700,
    water: '#AACBD8',
    contour: '#D8CFBE',
  },

  // Overlay tokens — used on hero images and frosted-glass elements.
  overlay: {
    dark: 'rgba(28,24,20,0.35)',
    darkStrong: 'rgba(28,24,20,0.45)',
    frosted: 'rgba(255,254,251,0.92)',
    onImage: '#FFFFFF',
    onImageMuted: 'rgba(255,255,255,0.85)',
  },
};
