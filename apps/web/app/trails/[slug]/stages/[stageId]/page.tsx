import { CtaBand } from '@/components/CtaBand';
import { DetailHero } from '@/components/DetailHero';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { RoutePreview } from '@/components/RoutePreview';
import { ContentBlocks } from '@/components/content/ContentBlocks';
import { AtAGlance } from '@/components/trail/AtAGlance';
import {
  getAccommodations,
  getContent,
  getHazards,
  getSection,
  getSections,
  getTrails,
  getWater,
} from '@/lib/api';
import { km, meters } from '@/lib/format';
import type { PoiPoint } from '@/lib/map';
import { trailSlug } from '@/lib/slug';
import type { Geometry } from 'geojson';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const trails = await getTrails();
  const params: { slug: string; stageId: string }[] = [];
  for (const t of trails) {
    const slug = trailSlug(t.ref, t.id);
    for (const s of await getSections(t.id)) params.push({ slug, stageId: String(s.id) });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stageId: string }>;
}): Promise<Metadata> {
  const { stageId } = await params;
  const stage = await getSection(Number(stageId));
  if (!stage) return { title: 'Stage not found' };
  return {
    title: `Stage ${stage.orderIndex}: ${stage.name}`,
    description: stage.description ?? `Stage ${stage.orderIndex} of the trail.`,
  };
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ slug: string; stageId: string }>;
}) {
  const { slug, stageId } = await params;
  const stage = await getSection(Number(stageId));
  if (!stage) notFound();

  const trails = await getTrails();
  const trail = trails.find((t) => t.id === stage.trailId);
  const color = trail?.waymark.symbol?.wayColor ?? undefined;

  const [content, water, accommodations, hazards] = await Promise.all([
    getContent('stage', stage.id),
    getWater(stage.trailId),
    getAccommodations(stage.trailId),
    getHazards(stage.trailId),
  ]);

  const lo = Math.min(stage.startChainageM, stage.endChainageM);
  const hi = Math.max(stage.startChainageM, stage.endChainageM);
  const inSpan = (m: number) => m >= lo && m <= hi;

  const elevation = (stage.elevationProfile ?? []).map((p) => p.e);
  const glanceStats = [
    { value: km(stage.distanceM), label: 'km' },
    ...(stage.ascentM != null ? [{ value: meters(stage.ascentM), label: 'm ↑' }] : []),
    ...(stage.descentM != null ? [{ value: meters(stage.descentM), label: 'm ↓' }] : []),
  ];

  // Water / refuges / hazards on this stage, drawn as icons on the stage map
  // (§17) instead of as lists. Only those within the stage span, with coords.
  const hasCoords = (p: { lat: number | null; lng: number | null }) =>
    p.lat != null && p.lng != null;
  const pois: PoiPoint[] = [
    ...water
      .filter((w) => inSpan(w.chainageM) && hasCoords(w))
      .map((w) => ({
        id: `w${w.id}`,
        kind: 'water' as const,
        name: w.name ?? 'Water',
        lng: w.lng as number,
        lat: w.lat as number,
      })),
    ...accommodations
      .filter((a) => inSpan(a.chainageM) && hasCoords(a))
      .map((a) => ({
        id: `a${a.id}`,
        kind: 'refuge' as const,
        name: a.name,
        lng: a.lng as number,
        lat: a.lat as number,
      })),
    ...hazards
      .filter((h) => inSpan(h.chainageM) && hasCoords(h))
      .map((h) => ({
        id: `h${h.id}`,
        kind: 'hazard' as const,
        name: h.name ?? h.type,
        lng: h.lng as number,
        lat: h.lat as number,
      })),
  ];

  return (
    <>
      <Header />
      <main>
        <DetailHero
          image={stage.imageUrl}
          kicker={`Stage ${stage.orderIndex}${stage.regionName ? ` · ${stage.regionName}` : ''}`}
          title={stage.name}
          lede={stage.description}
        />
        <AtAGlance stats={glanceStats} />

        <RoutePreview
          title="Stage map"
          geometry={(stage.geometry ?? null) as Geometry | null}
          color={color}
          elevation={elevation}
          pois={pois}
        />

        {content.length > 0 && (
          <section className="w-full px-6 py-12 md:px-20">
            <div className="mx-auto max-w-[820px]">
              <ContentBlocks blocks={content} />
            </div>
          </section>
        )}

        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
