import { TrailBrowse } from '@/components/TrailBrowse';
import { getTrails } from '@/lib/api';
import { trailCards, trailsByFacetSlug } from '@/lib/browse';
import { PLACE_BLURBS } from '@/lib/content';
import { slugify } from '@/lib/slug';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://roamhike.com';

export async function generateStaticParams() {
  const trails = await getTrails();
  const slugs = new Set(
    trails
      .map((t) => t.country)
      .filter((c): c is string => Boolean(c))
      .map(slugify),
  );
  return [...slugs].map((slug) => ({ slug }));
}

async function load(slug: string) {
  const trails = await getTrails();
  const matches = trailsByFacetSlug(trails, 'country', slug);
  return { matches, country: matches[0]?.country ?? null };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { country } = await load(slug);
  if (!country) return { title: 'Country not found' };
  const title = `Long-distance trails in ${country}`;
  return {
    title,
    description: `Hiking trail guides in ${country} on Roam — offline maps and an on-device guide.`,
    alternates: { canonical: `/countries/${slug}` },
  };
}

export default async function CountryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { matches, country } = await load(slug);
  if (!country) notFound();
  const { cards, symbols } = trailCards(matches);
  return (
    <TrailBrowse
      eyebrow="Country"
      title={country}
      description={PLACE_BLURBS[country] ?? `Long-distance trail guides across ${country}.`}
      cards={cards}
      symbols={symbols}
    />
  );
}
