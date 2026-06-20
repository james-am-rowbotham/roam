// Radius + spacing scales (Figma Foundations). Shared values; mobile consumes
// the numbers directly, web gets the radius scale as CSS vars via tokens.css.
// Spacing is intentionally NOT emitted to CSS — it would clash with Tailwind's
// own --spacing-* scale on the web, which uses its rem-based defaults there.

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
