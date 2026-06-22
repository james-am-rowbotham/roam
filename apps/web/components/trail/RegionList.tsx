import { Button } from '@/components/Button';
import { CardImage } from '@/components/CardImage';
import type { RegionSummary } from '@/lib/api';
import { km } from '@/lib/format';
import Link from 'next/link';

// "The N sections": one card per coarse Region (§5), linking to the region page.
// Closes with a green "walk the whole thing" CTA, mirroring the design.
export function RegionList({
  regions,
  slug,
  trailName,
}: {
  regions: RegionSummary[];
  slug: string;
  trailName: string;
}) {
  return (
    <section className="w-full px-6 py-16 md:px-[120px]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8">
        <h2 className="font-display text-[34px] font-semibold leading-[1.1] text-primary">
          The {numberWord(regions.length)} sections
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {regions.map((r) => (
            <RegionCard key={r.id} region={r} slug={slug} />
          ))}
          <div className="flex flex-col justify-between gap-6 rounded-2xl bg-accent p-7">
            <div className="flex flex-col gap-2">
              <p className="label-mono text-[11px] text-on-accent/80">Or go end to end</p>
              <h3 className="font-display text-[22px] font-semibold leading-[1.15] text-on-accent">
                Walk the whole {trailName}
              </h3>
              <p className="font-body text-[15px] leading-[1.5] text-on-accent/85">
                Plan every stage, download the offline map, and let the guide walk with you from the
                first refuge to the last.
              </p>
            </div>
            <Button href="/contact" variant="onAccent" size="md">
              Plan this trail →
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function RegionCard({ region, slug }: { region: RegionSummary; slug: string }) {
  const stages =
    region.stageStart === region.stageEnd
      ? `Stage ${region.stageStart}`
      : `Stages ${region.stageStart}–${region.stageEnd}`;
  return (
    <Link href={`/trails/${slug}/regions/${region.id}`} className="block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
        <CardImage src={region.imageUrl} alt={region.name} height={160} />
        <div className="flex flex-col gap-1.5 px-[18px] pb-[18px] pt-4">
          <p className="label-mono text-[11px] text-primary">
            Section · {stages} · {km(region.distanceM)} km
          </p>
          <h3 className="font-body text-[18px] font-semibold text-primary">{region.name}</h3>
          {region.description && (
            <p className="line-clamp-2 font-mono text-[12px] tracking-[0.02em] text-secondary">
              {region.description}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

function numberWord(n: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  return words[n] ?? `${n}`;
}
