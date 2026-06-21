import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { type ExploreItem, MapExplore } from '@/components/MapExplore';
import { getAccommodations, getTrailFeature, getTrails, getWater } from '@/lib/api';
import { dayRange, formatDistance, km, meters } from '@/lib/format';
import type { PoiPoint } from '@/lib/map';
import { trailSlug } from '@/lib/slug';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://roamhike.com';

export default async function HomePage() {
  // Live trail catalogue + geometry + POIs (water, refuges) from the API.
  const trails = await getTrails();
  const [features, waters, stays] = await Promise.all([
    Promise.all(trails.map((t) => getTrailFeature(t.id))),
    Promise.all(trails.map((t) => getWater(t.id))),
    Promise.all(trails.map((t) => getAccommodations(t.id))),
  ]);

  // Build the explorable items: one entity (for the shared filter engine), its
  // map route line, its result-grid card, and the stats + elevation shown in the
  // selected-trail carousel. The map + carousel are driven client-side.
  const items: ExploreItem[] = trails.map((t, i) => {
    const hi = t.elevation.length ? Math.max(...t.elevation) : null;
    const slug = trailSlug(t.ref, t.id);
    const title = t.ref ?? t.name;
    const pois: PoiPoint[] = [
      ...(waters[i] ?? [])
        .filter((w) => w.lat != null && w.lng != null)
        .map((w) => ({
          id: `w${w.id}`,
          kind: 'water' as const,
          name: w.name ?? 'Water',
          lng: w.lng as number,
          lat: w.lat as number,
        })),
      ...(stays[i] ?? [])
        .filter((a) => a.lat != null && a.lng != null)
        .map((a) => ({
          id: `a${a.id}`,
          kind: 'refuge' as const,
          name: a.name,
          lng: a.lng as number,
          lat: a.lat as number,
        })),
    ];
    return {
      id: String(t.id),
      entity: {
        id: String(t.id),
        kind: 'trail',
        name: t.ref ?? t.name,
        ref: t.ref,
        country: t.country,
        region: t.region,
        distanceM: t.distanceM,
        keywords: [t.name, t.description].filter((s): s is string => Boolean(s)),
      },
      route: {
        id: String(t.id),
        geometry: features[i]?.geometry ?? null,
        color: t.waymark.symbol?.wayColor ?? undefined,
        pois,
      },
      card: {
        title,
        subtitle: [formatDistance(t.distanceM), t.country].filter(Boolean).join(' · ') || t.name,
        image: t.imageUrl ?? undefined,
        href: `/trails/${slug}`,
      },
      symbol: t.waymark.symbol,
      stats: [
        { value: km(t.distanceM), label: 'km' },
        { value: dayRange(t.distanceM), label: 'days' },
        ...(hi != null ? [{ value: Math.round(hi).toLocaleString('en-US'), label: 'm high' }] : []),
      ],
      elevation: t.elevation,
      description: t.description,
      facts: [
        ...(t.country ? [{ label: 'Country', value: t.country }] : []),
        ...(t.region ? [{ label: 'Range', value: t.region }] : []),
        ...(t.ascentM != null ? [{ label: 'Ascent', value: meters(t.ascentM) }] : []),
        ...(t.descentM != null ? [{ label: 'Descent', value: meters(t.descentM) }] : []),
      ],
    };
  });

  return (
    <>
      <JsonLd trails={items.map((i) => i.card)} />
      <Header />
      <main>
        <MapExplore items={items} />
      </main>
      <Footer />
    </>
  );
}

// schema.org structured data — helps Roam win "the place to read up about the
// GR11" (§21). The site as a WebSite + the onboarded trails as an ItemList of
// TouristTrip entries.
function JsonLd({ trails }: { trails: { title: string; subtitle: string; href: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Roam',
        url: siteUrl,
        description:
          'Plan, navigate and finish the world’s great long-distance hikes with offline maps and an on-device guide.',
      },
      {
        '@type': 'ItemList',
        name: 'Popular long-distance trails',
        itemListElement: trails.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'TouristTrip',
            name: t.title,
            description: t.subtitle,
            url: t.href.startsWith('http') ? t.href : `${siteUrl}${t.href}`,
          },
        })),
      },
    ],
  };
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD we construct
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
