import { CtaBand } from '@/components/CtaBand';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { AtAGlance } from '@/components/trail/AtAGlance';
import { RegionList } from '@/components/trail/RegionList';
import { RouteSection } from '@/components/trail/RouteSection';
import { TrailHero } from '@/components/trail/TrailHero';
import { TrailIntro } from '@/components/trail/TrailIntro';
import { findTrailByRef, getSections, getTrailFeature, getTrails } from '@/lib/api';
import { dayRange, km, meters } from '@/lib/format';
import { groupSectionsIntoRegions } from '@/lib/regions';
import { findTrailBySlug, trailSlug } from '@/lib/slug';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://roamhike.com';

// Pre-render every onboarded trail at build; unknown slugs still resolve on
// demand (the API may be cold at build time → empty list here).
export async function generateStaticParams() {
  const trails = await getTrails();
  return trails.map((t) => ({ slug: trailSlug(t.ref, t.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const trail = findTrailBySlug(await getTrails(), slug);
  if (!trail) return { title: 'Trail not found' };
  const title = `The ${trail.ref ?? trail.name} — ${km(trail.distanceM)} km trail guide`;
  const description =
    trail.description ?? `A ${km(trail.distanceM)} km long-distance trail guide on Roam.`;
  return {
    title,
    description,
    alternates: { canonical: `/trails/${slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${siteUrl}/trails/${slug}`,
      images: trail.imageUrl ? [{ url: trail.imageUrl }] : undefined,
    },
  };
}

export default async function TrailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trails = await getTrails();
  const trail = findTrailBySlug(trails, slug) ?? findTrailByRef(trails, slug);
  if (!trail) notFound();

  const [route, sections] = await Promise.all([getTrailFeature(trail.id), getSections(trail.id)]);
  const regions = groupSectionsIntoRegions(sections);
  const wayColor = trail.waymark.symbol?.wayColor ?? undefined;
  const hi = trail.elevation.length ? Math.max(...trail.elevation) : null;

  const startLabel = regions[0]?.from ?? 'Start';
  const endLabel = regions[regions.length - 1]?.to ?? 'Finish';
  const endpoints = `${startLabel} → ${endLabel}`;

  const glanceStats = [
    { value: km(trail.distanceM), label: 'Distance (km)' },
    { value: `${sections.length}`, label: 'Stages' },
    { value: dayRange(trail.distanceM), label: 'Days' },
    { value: `${regions.length}`, label: 'Sections' },
    { value: hi != null ? meters(hi) : '—', label: 'High point' },
  ];

  // Prose composed from facts only — no invented editorial (§21 read layer lands
  // later via the content pipeline).
  const paragraphs = [
    `The ${trail.ref ?? trail.name} is a ${km(trail.distanceM)}-kilometre traverse of the Pyrenees${
      trail.description ? ` — ${trail.description}` : ''
    }.`,
    `It divides cleanly into ${numberWord(regions.length)} sections you can walk on their own${
      regions.length ? `: ${regions.map((r) => r.name).join(', ')}` : ''
    }. Most walkers take ${dayRange(trail.distanceM)} days end to end, but each section has its own character, terrain and best window.`,
  ];

  const facts = [
    { label: 'Best season', value: 'Late June – September' },
    { label: 'Difficulty', value: 'Strenuous · multi-week' },
    { label: 'Waymarking', value: waymarkLabel(trail) },
    ...(hi != null ? [{ label: 'Highest point', value: meters(hi) }] : []),
    { label: 'Resupply', value: 'Villages every few days' },
  ];

  return (
    <>
      <Header />
      <main>
        <TrailHero trail={trail} stageCount={sections.length} endpoints={endpoints} />
        <AtAGlance stats={glanceStats} />
        <TrailIntro trail={trail} paragraphs={paragraphs} facts={facts} />
        <RouteSection
          route={route}
          wayColor={wayColor}
          elevation={trail.elevation}
          startLabel={startLabel}
          endLabel={endLabel}
        />
        {regions.length > 0 && <RegionList regions={regions} trailName={trail.ref ?? trail.name} />}
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}

function waymarkLabel(trail: {
  waymark: {
    symbol: { foregrounds: { colorName: string }[]; background: { colorName: string } } | null;
    network: string | null;
  };
}): string {
  const sym = trail.waymark.symbol;
  if (!sym) return trail.waymark.network ?? 'Waymarked';
  // Collect every distinct, non-empty colour name across the plate + marks, so a
  // GR's painted "white & red" reads correctly regardless of which field holds
  // which colour.
  const names = [sym.background.colorName, ...sym.foregrounds.map((f) => f.colorName)]
    .map((n) => n?.trim())
    .filter((n): n is string => Boolean(n));
  const unique = [...new Set(names)];
  if (unique.length === 0) return trail.waymark.network ?? 'Waymarked';
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return unique.map(cap).join(' & ');
}

function numberWord(n: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  return words[n] ?? `${n}`;
}
