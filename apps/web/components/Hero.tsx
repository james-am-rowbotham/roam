import type { MapRoute } from '@/lib/map';
import { Button } from './Button';
import { Chip } from './Chip';
import { HeroMap } from './HeroMap';

// hero-explore (map): a live, interactive MapLibre map of every onboarded trail
// (GR10, GR11…), each with a trail-card popup over its line, plus the product
// pitch card and a decorative search/filter bar. The floating chrome (search,
// chips) is desktop-only; on small screens the pitch card stands alone.
export function Hero({ routes }: { routes: MapRoute[] }) {
  return (
    <section className="relative w-full overflow-hidden bg-map-base" aria-label="Explore trails">
      {/* Live MapLibre map of the routes */}
      <div className="relative h-[560px] w-full md:h-[640px]">
        <HeroMap routes={routes} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-app/40 via-transparent to-transparent" />

        {/* Search bar (decorative) */}
        <div className="absolute left-1/2 top-4 hidden w-[560px] max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-[14px] py-[11px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] lg:flex">
          <SearchIcon />
          <span className="flex-1 truncate font-body text-[15px] text-secondary">
            Search trails, peaks and refuges across the Pyrenées…
          </span>
        </div>

        {/* Filter chips */}
        <div className="absolute left-1/2 top-[65px] hidden -translate-x-1/2 items-center gap-2 lg:flex">
          <Chip label="Moderate" selected />
          <Chip label="2–3 days" selected />
          <Chip label="Any distance" />
        </div>

        {/* Pitch card */}
        <div className="absolute left-1/2 top-1/2 w-[407px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 lg:left-[60px] lg:translate-x-0">
          <div className="flex flex-col gap-[18px] rounded-xl border border-line bg-surface/95 p-8 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur">
            <p className="label-mono text-[9.5px] text-secondary">Long-distance hiking</p>
            <h1 className="font-display text-[34px] font-semibold leading-[1.16] tracking-[-0.34px] text-primary">
              Every great trail, in your pocket.
            </h1>
            <p className="font-body text-[16px] leading-[1.45] text-secondary">
              Plan, navigate and finish the world’s great long-distance hikes. Offline maps and an
              on-device guide that knows every refuge, spring and junction.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button href="#cta" variant="solid" size="lg">
                Get the app
              </Button>
              <Button href="#popular-trails" variant="outline" size="lg">
                Browse trails
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0" role="img">
      <title>Search</title>
      <circle cx="11" cy="11" r="7" stroke="#6f6a60" strokeWidth="2" />
      <path d="m20 20-3-3" stroke="#6f6a60" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
