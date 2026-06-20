import { ElevationProfile } from '@/components/ElevationProfile';
import { HeroMap } from '@/components/HeroMap';
import type { TrailFeature } from '@/lib/api';
import { meters } from '@/lib/format';

// "The route": the live interactive MapLibre map of the line, plus the elevation
// profile with its endpoints and range labelled.
export function RouteSection({
  route,
  wayColor,
  elevation,
  startLabel,
  endLabel,
}: {
  route: TrailFeature | null;
  wayColor?: string;
  elevation: number[];
  startLabel: string;
  endLabel: string;
}) {
  const lo = elevation.length ? Math.min(...elevation) : 0;
  const hi = elevation.length ? Math.max(...elevation) : 0;

  return (
    <section className="w-full bg-app px-6 py-16 md:px-[120px]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8">
        <h2 className="font-display text-[34px] font-semibold leading-[1.1] text-primary">
          The route
        </h2>

        <div className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-line">
          <HeroMap routes={[{ geometry: route?.geometry ?? null, color: wayColor }]} />
          <span className="pointer-events-none absolute left-4 top-4 rounded-md bg-primary/90 px-[9px] py-[5px]">
            <span className="label-mono text-[11px] tracking-[0.06em] text-white">
              Interactive route map · {startLabel} → {endLabel}
            </span>
          </span>
        </div>

        {elevation.length > 1 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="label-mono text-[12px] text-secondary">Elevation</span>
              <span className="label-mono text-[12px] text-secondary">
                {meters(lo)} → {meters(hi)}
              </span>
            </div>
            <ElevationProfile data={elevation} height={120} />
            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] text-secondary">{startLabel}</span>
              <span className="font-mono text-[12px] text-secondary">{endLabel}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
