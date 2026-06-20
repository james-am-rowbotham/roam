// The shape of the design-token theme. Colour values + their types come from the
// shared @roam/tokens package; the font/type shapes below are mobile-specific.

import type { ColorTokens, StatusPair } from '@roam/tokens';

export type { ColorTokens, StatusPair };
// Kept as an alias so existing `ThemeColors` imports across the app still work.
export type ThemeColors = ColorTokens;

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
