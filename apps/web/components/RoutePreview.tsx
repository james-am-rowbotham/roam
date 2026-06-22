import { ElevationProfile } from '@/components/ElevationProfile';
import { HeroMap } from '@/components/HeroMap';
import type { PoiPoint } from '@/lib/map';
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
  pois,
}: {
  title?: string;
  geometry: Geometry | null;
  color?: string;
  elevation: number[];
  startLabel?: string;
  endLabel?: string;
  /** Water / refuge / hazard markers drawn on the preview map (§17). */
  pois?: PoiPoint[];
}) {
  return (
    <section className="w-full bg-app px-6 py-12 md:px-[120px]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
        {title && (
          <h2 className="font-display text-[28px] font-semibold leading-[1.1] text-primary">
            {title}
          </h2>
        )}

        <div className="relative h-[340px] w-full overflow-hidden rounded-2xl border border-line">
          <HeroMap routes={[{ id: 'preview', geometry, color, pois }]} preview />
        </div>

        {elevation.length > 1 && (
          <ElevationProfile
            data={elevation}
            height={120}
            startLabel={startLabel}
            endLabel={endLabel}
          />
        )}
      </div>
    </section>
  );
}
