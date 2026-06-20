import { CardSection } from '@/components/CardSection';
import { CtaBand } from '@/components/CtaBand';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { getTrailFeature, getTrails } from '@/lib/api';
import { facetCards, trailCards } from '@/lib/browse';
import { dayRange, km } from '@/lib/format';
import type { MapRoute } from '@/lib/map';
import { trailSlug } from '@/lib/slug';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://roamhike.com';

export default async function HomePage() {
  // Live trail catalogue from the API (falls back to [] → no sections render).
  const trails = await getTrails();

  // Trail cards + the country / mountain-range browse sections, all derived from
  // what's actually onboarded — every card links to a real, populated page.
  const { cards: popular, symbols } = trailCards(trails);
  const countryCards = facetCards(trails, 'country');
  const rangeCards = facetCards(trails, 'region');

  // Every onboarded trail's geometry for the live hero map — each rendered in its
  // painted way colour with a trail-card popup (null geometry is dropped → map
  // shows a Pyrenees view).
  const features = await Promise.all(trails.map((t) => getTrailFeature(t.id)));
  const mapRoutes: MapRoute[] = trails
    .map((t, i) => {
      const hi = t.elevation.length ? Math.max(...t.elevation) : null;
      return {
        geometry: features[i]?.geometry ?? null,
        color: t.waymark.symbol?.wayColor ?? undefined,
        card: {
          title: t.ref ?? t.name,
          subtitle: [t.country, t.region].filter(Boolean).join(' · ') || undefined,
          image: t.imageUrl,
          href: `/trails/${trailSlug(t.ref, t.id)}`,
          stats: [
            { value: km(t.distanceM), label: 'km' },
            { value: dayRange(t.distanceM), label: 'days' },
            ...(hi != null
              ? [{ value: Math.round(hi).toLocaleString('en-US'), label: 'm high' }]
              : []),
          ],
        },
      };
    })
    .filter((r) => r.geometry);

  return (
    <>
      <JsonLd trails={popular} />
      <Header />
      <main>
        <Hero routes={mapRoutes} />
        <CardSection
          id="popular-trails"
          eyebrow="Popular trails"
          title="Start with a classic"
          cards={popular}
          imageHeight={210}
          symbols={symbols}
        />
        {countryCards.length > 0 && (
          <CardSection
            id="countries"
            eyebrow="Browse by country"
            title="Pick a country"
            cards={countryCards}
          />
        )}
        {rangeCards.length > 0 && (
          <CardSection
            id="ranges"
            eyebrow="Browse by region"
            title="Explore by mountain range"
            cards={rangeCards}
          />
        )}
        <CtaBand />
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
