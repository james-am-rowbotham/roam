import { Button } from '@/components/Button';
import type { TrailListItem } from '@/lib/api';
import { dayRange, km } from '@/lib/format';
import Image from 'next/image';

// Full-bleed trail hero: cover image, scrim, eyebrow, title, lede and a row of
// stat pills (§16 hero pattern). `endpoints` is the derived "Irun → Cap de
// Creus" gateway pair.
export function TrailHero({
  trail,
  stageCount,
  endpoints,
}: {
  trail: TrailListItem;
  stageCount: number;
  endpoints: string | null;
}) {
  const pills = [
    `${km(trail.distanceM)} km`,
    `${stageCount} stages`,
    `${dayRange(trail.distanceM)} days`,
    endpoints,
  ].filter(Boolean) as string[];

  return (
    <section className="relative w-full overflow-hidden bg-map-base">
      <div className="relative h-[520px] w-full md:h-[600px]">
        {trail.imageUrl && (
          <Image
            src={trail.imageUrl}
            alt={trail.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-6 pb-16 md:px-20">
            <p className="label-mono text-[12px] text-on-accent/85">Long-distance trail guide</p>
            <h1 className="max-w-[760px] font-display text-[44px] font-semibold leading-[1.05] tracking-[-0.5px] text-on-accent md:text-[52px]">
              {trail.ref ? `The ${trail.ref}: ` : ''}
              {trail.description ?? trail.name}
            </h1>
            <div className="flex flex-wrap gap-2">
              {pills.map((p) => (
                <span
                  key={p}
                  className="label-mono rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] tracking-[0.08em] text-on-accent backdrop-blur-sm"
                >
                  {p}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button href="#cta" variant="solid" size="lg">
                Plan this trail
              </Button>
              <Button href="#cta" variant="onAccent" size="lg">
                Download the app
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
