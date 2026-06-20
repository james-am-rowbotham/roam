import { TrailBrowse } from '@/components/TrailBrowse';
import { getTrails } from '@/lib/api';
import { trailCards, trailsByFacetSlug } from '@/lib/browse';
import { PLACE_BLURBS } from '@/lib/content';
import { slugify } from '@/lib/slug';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const trails = await getTrails();
  const slugs = new Set(
    trails
      .map((t) => t.region)
      .filter((r): r is string => Boolean(r))
      .map(slugify),
  );
  return [...slugs].map((slug) => ({ slug }));
}

async function load(slug: string) {
  const trails = await getTrails();
  const matches = trailsByFacetSlug(trails, 'region', slug);
  return { matches, region: matches[0]?.region ?? null };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { region } = await load(slug);
  if (!region) return { title: 'Place not found' };
  const title = `Hiking the ${region}`;
  return {
    title,
    description: `Long-distance trail guides across the ${region} on Roam.`,
    alternates: { canonical: `/places/${slug}` },
  };
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { matches, region } = await load(slug);
  if (!region) notFound();
  const { cards, symbols } = trailCards(matches);
  return (
    <TrailBrowse
      eyebrow="Mountain range"
      title={region}
      description={PLACE_BLURBS[region] ?? `Long-distance trail guides across the ${region}.`}
      cards={cards}
      symbols={symbols}
    />
  );
}
