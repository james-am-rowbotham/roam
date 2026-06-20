import { Button } from '@/components/Button';
import { CardImage } from '@/components/CardImage';
import { km } from '@/lib/format';
import type { RegionGroup } from '@/lib/regions';

// "The N sections": one card per coarse Region (§5), derived by grouping the
// trail's stages. Each card shows its stage range, distance and gateway towns.
// Closes with a green "walk the whole thing" CTA, mirroring the design.
export function RegionList({
  regions,
  trailName,
}: {
  regions: RegionGroup[];
  trailName: string;
}) {
  const word = numberWord(regions.length);
  return (
    <section className="w-full px-6 py-16 md:px-[120px]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8">
        <h2 className="font-display text-[34px] font-semibold leading-[1.1] text-primary">
          The {word} sections
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {regions.map((r) => (
            <RegionCard key={r.name} region={r} />
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
            <Button href="#cta" variant="onAccent" size="md">
              Plan this trail →
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function RegionCard({ region }: { region: RegionGroup }) {
  const stages =
    region.stageStart === region.stageEnd
      ? `Stage ${region.stageStart}`
      : `Stages ${region.stageStart}–${region.stageEnd}`;
  const gateway = region.from && region.to ? `${region.from} → ${region.to}` : region.from;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <CardImage src={region.image} alt={region.name} height={160} />
      <div className="flex flex-col gap-1.5 px-[18px] pb-[18px] pt-4">
        <p className="label-mono text-[11px] text-accent">
          {stages} · {km(region.distanceM)} km
        </p>
        <h3 className="font-body text-[18px] font-semibold text-primary">{region.name}</h3>
        {gateway && (
          <p className="font-mono text-[12px] tracking-[0.02em] text-secondary">{gateway}</p>
        )}
      </div>
    </article>
  );
}

function numberWord(n: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  return words[n] ?? `${n}`;
}
