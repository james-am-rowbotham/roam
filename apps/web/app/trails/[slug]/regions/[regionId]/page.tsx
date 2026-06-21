import { CtaBand } from '@/components/CtaBand';
import { DetailHero } from '@/components/DetailHero';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { RoutePreview } from '@/components/RoutePreview';
import { SectionHeader } from '@/components/SectionHeader';
import { ContentBlocks } from '@/components/content/ContentBlocks';
import { AtAGlance } from '@/components/trail/AtAGlance';
import { PoiList } from '@/components/trail/PoiList';
import { StageList } from '@/components/trail/StageList';
import {
  findTrailByRef,
  getAccommodations,
  getRegion,
  getRegions,
  getSections,
  getTrails,
  getWater,
} from '@/lib/api';
import { km } from '@/lib/format';
import { trailSlug } from '@/lib/slug';
import type { Geometry } from 'geojson';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const trails = await getTrails();
  const params: { slug: string; regionId: string }[] = [];
  for (const t of trails) {
    const slug = trailSlug(t.ref, t.id);
    for (const r of await getRegions(t.id)) params.push({ slug, regionId: String(r.id) });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; regionId: string }>;
}): Promise<Metadata> {
  const { regionId } = await params;
  const region = await getRegion(Number(regionId));
  if (!region) return { title: 'Region not found' };
  return {
    title: `${region.name} — ${km(region.distanceM)} km`,
    description: region.description ?? `The ${region.name} region of the trail.`,
  };
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ slug: string; regionId: string }>;
}) {
  const { slug, regionId } = await params;
  const trails = await getTrails();
  const trail = findTrailByRef(trails, slug) ?? trails.find((t) => trailSlug(t.ref, t.id) === slug);
  const region = await getRegion(Number(regionId));
  if (!trail || !region) notFound();

  const [sections, water, accommodations] = await Promise.all([
    getSections(trail.id),
    getWater(trail.id),
    getAccommodations(trail.id),
  ]);

  const stages = sections
    .filter((s) => s.regionId === region.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const lo = Math.min(
    ...stages.map((s) => Math.min(s.startChainageM, s.endChainageM)),
    Number.POSITIVE_INFINITY,
  );
  const hi = Math.max(
    ...stages.map((s) => Math.max(s.startChainageM, s.endChainageM)),
    Number.NEGATIVE_INFINITY,
  );
  const inSpan = (m: number) => m >= lo && m <= hi;

  const elevation = (region.elevationProfile ?? []).map((p) => p.e);
  const highPoint = elevation.length ? Math.max(...elevation) : null;
  const color = trail.waymark.symbol?.wayColor ?? undefined;

  const glanceStats = [
    { value: km(region.distanceM), label: 'km' },
    { value: String(region.stageCount), label: 'stages' },
    ...(highPoint != null
      ? [{ value: Math.round(highPoint).toLocaleString('en-US'), label: 'm high' }]
      : []),
  ];

  return (
    <>
      <Header />
      <main>
        <DetailHero
          image={region.imageUrl}
          kicker={`Stages ${region.stageStart}–${region.stageEnd}`}
          title={region.name}
          lede={region.description}
        />
        <AtAGlance stats={glanceStats} />

        <RoutePreview
          title="Region map"
          geometry={(region.geometry ?? null) as Geometry | null}
          color={color}
          elevation={elevation}
          overlay={`${trail.ref ?? trail.name} · ${region.name}`}
        />

        {region.contentBlocks.length > 0 && (
          <section className="w-full px-6 py-14 md:px-20">
            <div className="mx-auto max-w-[820px]">
              <ContentBlocks blocks={region.contentBlocks} />
            </div>
          </section>
        )}

        <section className="w-full px-6 py-12 md:px-20">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-7">
            <SectionHeader eyebrow={`${stages.length} stages`} title="Stages in this region" />
            <StageList slug={slug} stages={stages} />
          </div>
        </section>

        {(water.some((w) => inSpan(w.chainageM)) ||
          accommodations.some((a) => inSpan(a.chainageM))) && (
          <section className="w-full px-6 pb-12 md:px-20">
            <div className="mx-auto grid max-w-[1440px] gap-8 md:grid-cols-2">
              <PoiList
                title="Water"
                items={water
                  .filter((w) => inSpan(w.chainageM))
                  .map((w) => ({
                    id: `w${w.id}`,
                    name: w.name ?? 'Water source',
                    meta: `${km(w.chainageM)} km`,
                    tag: w.seasonal ? 'Seasonal' : undefined,
                  }))}
              />
              <PoiList
                title="Where to stay"
                items={accommodations
                  .filter((a) => inSpan(a.chainageM))
                  .map((a) => ({
                    id: `a${a.id}`,
                    name: a.name,
                    meta: `${km(a.chainageM)} km`,
                    tag: a.type,
                  }))}
              />
            </div>
          </section>
        )}

        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
