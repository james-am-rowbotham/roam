import type { OsmcSymbol } from '@roam/core';
import type { TrailListItem } from './api';
import { type ExploreCard, PLACE_BLURBS } from './content';
import { formatDistance } from './format';
import { slugify, trailSlug } from './slug';

export type SymbolMap = Record<string, OsmcSymbol | null>;

// Turn trails into explore cards (linking to each trail's guide), plus the
// parsed waymark per card title for the blaze badge. Shared by the home page and
// the country / place browse pages so trail cards look identical everywhere.
export function trailCards(trails: TrailListItem[]): { cards: ExploreCard[]; symbols: SymbolMap } {
  const symbols: SymbolMap = {};
  const cards = trails.map((t) => {
    const title = t.ref ?? t.name;
    symbols[title] = t.waymark.symbol;
    return {
      title,
      subtitle: [formatDistance(t.distanceM), t.country].filter(Boolean).join(' · ') || t.name,
      image: t.imageUrl ?? undefined,
      href: `/trails/${trailSlug(t.ref, t.id)}`,
    };
  });
  return { cards, symbols };
}

export type Facet = 'country' | 'region';

const FACET_BASE: Record<Facet, string> = { country: '/countries', region: '/places' };

const facetValue = (t: TrailListItem, facet: Facet) => (facet === 'country' ? t.country : t.region);

// Group the catalogue by a facet (country or mountain range) into browse cards
// that link to a real listing page. Only facets that actually have trails are
// returned — nothing renders a dead end.
export function facetCards(trails: TrailListItem[], facet: Facet): ExploreCard[] {
  const groups = new Map<string, TrailListItem[]>();
  for (const t of trails) {
    const name = facetValue(t, facet);
    if (!name) continue;
    const list = groups.get(name);
    if (list) list.push(t);
    else groups.set(name, [t]);
  }
  return [...groups.entries()].map(([name, list]) => ({
    title: name,
    subtitle: PLACE_BLURBS[name] ?? `${list.length} trail${list.length > 1 ? 's' : ''}`,
    image: list.find((t) => t.imageUrl)?.imageUrl ?? undefined,
    href: `${FACET_BASE[facet]}/${slugify(name)}`,
  }));
}

/** Trails whose facet value matches a URL slug (for the listing pages). */
export function trailsByFacetSlug(
  trails: TrailListItem[],
  facet: Facet,
  slug: string,
): TrailListItem[] {
  return trails.filter((t) => {
    const name = facetValue(t, facet);
    return name != null && slugify(name) === slug;
  });
}
