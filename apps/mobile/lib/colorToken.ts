import { colors } from '../theme';

// Resolve a registry `colorToken` (a dotted path like `marker.water` / `trail.sl` /
// `text.primary` from @roam/content) to a concrete theme colour. Keeps colour out of
// the registry (which stays UI-agnostic) and the hex out of components. Unknown tokens
// fall back to text.primary rather than crashing — an unmapped marker still renders.
export function resolveColorToken(token: string): string {
  const value = token
    .split('.')
    .reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], colors);
  return typeof value === 'string' ? value : colors.text.primary;
}
