// Static copy for the explore page. The browse sections (popular trails,
// countries, mountain ranges) are derived from the live API at request time
// (see lib/browse.ts) — this file only holds the card type, the curated blurbs
// keyed by place name, and the header nav.

export interface ExploreCard {
  title: string;
  subtitle: string;
  href: string;
  /** DB-sourced image URL; a themed placeholder shows when absent. */
  image?: string;
  /** Small type label shown above the title (e.g. "Trail", "Country"). */
  eyebrow?: string;
}

// Curated one-liners for countries and mountain ranges we have copy for. A
// derived "{n} trails" subtitle is used as the fallback.
export const PLACE_BLURBS: Record<string, string> = {
  Pyrenees: 'The great east–west traverses',
  Spain: 'Green Atlantic north to dry sierras',
  France: 'Alps, Pyrenees and the GR network',
};

type NavLink = { label: string; href: string };
export const navLinks: NavLink[] = [];
