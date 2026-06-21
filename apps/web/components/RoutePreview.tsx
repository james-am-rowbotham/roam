import { ElevationProfile } from '@/components/ElevationProfile';
import { HeroMap } from '@/components/HeroMap';
import { meters } from '@/lib/format';
import type { Geometry } from 'geojson';

// A live MapLibre preview of one route line (trail / region slice / stage slice),
// drawn in its painted way colour, with the elevation profile + endpoints below.
// Shared by the trail, region and stage pages so every level renders its correct
// geometry the same way.
export function RoutePreview({
  title,
  geometry,
  color,
  elevation,
  startLabel,
  endLabel,
  overlay,
}: {
  title?: string;
  geometry: Geometry | null;
  color?: string;
  elevation: number[];
  startLabel?: string;
  endLabel?: string;
  overlay?: string;
}) {
  const lo = elevation.length ? Math.min(...elevation) : 0;
  const hi = elevation.length ? Math.max(...elevation) : 0;

  return (
    <section className="w-full bg-app px-6 py-12 md:px-[120px]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
        {title && (
          <h2 className="font-display text-[28px] font-semibold leading-[1.1] text-primary">
            {title}
          </h2>
        )}

        <div className="relative h-[340px] w-full overflow-hidden rounded-2xl border border-line">
          <HeroMap routes={[{ id: 'preview', geometry, color }]} />
          {overlay && (
            <span className="pointer-events-none absolute left-4 top-4 rounded-md bg-primary/90 px-[9px] py-[5px]">
              <span className="label-mono text-[11px] tracking-[0.06em] text-white">{overlay}</span>
            </span>
          )}
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
            {(startLabel || endLabel) && (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] text-secondary">{startLabel}</span>
                <span className="font-mono text-[12px] text-secondary">{endLabel}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
