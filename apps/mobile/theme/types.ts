// The shape of the design-token theme. Values live in ./index.ts and mirror
// the Figma variables on the Foundations page (node 28:2).

export interface StatusPair {
  bg: string;
  text: string;
}

export interface ThemeColors {
  accent: string;
  bg: { app: string; surface: string; subtle: string; input: string };
  border: { default: string };
  text: { primary: string; secondary: string; onAccent: string; tabActive: string };
  trail: { international: string; national: string; gr: string; local: string };
  marker: { water: string; refuge: string; viewpoint: string; historic: string; food: string };
  status: {
    warn: StatusPair;
    danger: StatusPair;
    success: StatusPair;
    /** Progress/active state (replaced the blue "info" pair; resolves to green). */
    progress: StatusPair;
  };
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

export interface ThemeFonts {
  /** Display face for headings (Bricolage). Never below 15px. */
  display: string;
  displayBold: string;
  regular: string;
  medium: string;
  semiBold: string;
  bold: string;
  /** Mono face for numerals, stats and uppercase micro-labels (Geist Mono). */
  mono: string;
  monoMedium: string;
}

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

export interface ThemeType {
  title: TypeStyle;
  sectionHeader: TypeStyle;
  cardTitle: TypeStyle;
  statValue: TypeStyle;
  bodyLarge: TypeStyle;
  body: TypeStyle;
  meta: TypeStyle;
  label: TypeStyle;
  tab: TypeStyle;
  /** List titles, chip labels, button labels. */
  bodyStrong: TypeStyle;
  /** Small numeric values (list-item values, ribbon stats). */
  dataS: TypeStyle;
  /** Small numeric metas (itinerary row metas). */
  dataMeta: TypeStyle;
  /** Detail-screen tabs (Overview/Sections/Guide). */
  detailTab: TypeStyle;
}

export interface Theme {
  colors: ThemeColors;
  fonts: ThemeFonts;
  type: ThemeType;
}
