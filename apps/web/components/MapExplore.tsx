'use client';

import type { ExploreCard } from '@/lib/content';
import type { MapRoute } from '@/lib/map';
import { useDismiss } from '@/lib/useDismiss';
import {
  DIFFICULTIES,
  DISTANCE_BANDS,
  DURATION_BANDS,
  type FacetOption,
  type FilterChip,
  KIND_LABELS,
  type MapEntity,
  type MapFilters,
  type OsmcSymbol,
  activeFilterChips,
  facetOptions,
  filterEntities,
  hasActiveFilters,
  toggleFilterValue,
} from '@roam/core';
import { ListFilter, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from './Button';
import { Chip } from './Chip';
import { HeroMap } from './HeroMap';
import { SearchModal } from './SearchModal';
import type { StatItem } from './Stat';
import { TrailCarousel } from './TrailCarousel';

// One explorable thing on the map: the entity the engine filters on, its map
// route (line), its result-grid card, and the stats + elevation shown in the
// selected-trail carousel.
export interface ExploreItem {
  id: string;
  entity: MapEntity;
  route: MapRoute;
  card: ExploreCard;
  symbol: OsmcSymbol | null;
  stats: StatItem[];
  elevation: number[];
  description?: string | null;
  facts: StatItem[];
}

// The interactive explore surface. Search and filters run through the shared
// @roam/core engine (same logic the mobile map will use). The map fills the
// viewport below the top bar; selecting a filter updates the routes, the result
// grid and the count together — the map updates in place, never re-mounting.
export function MapExplore({ items }: { items: ExploreItem[] }) {
  const [filters, setFilters] = useState<MapFilters>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);
  useDismiss(filterRef, () => setFilterOpen(false), filterOpen);

  const entities = useMemo(() => items.map((i) => i.entity), [items]);
  // EVERY trail stays on the map; filters/search only change which ones are
  // emphasised vs ghosted (HeroMap's tiers). `matchedIds` is the in-filter set.
  const routes = useMemo(() => items.map((i) => i.route), [items]);
  const matchedIds = useMemo(
    () => filterEntities(entities, filters).map((e) => e.id),
    [entities, filters],
  );
  const matched = useMemo(() => {
    const set = new Set(matchedIds);
    return items.filter((i) => set.has(i.id));
  }, [items, matchedIds]);

  // Selected trail for the carousel — always one of the matched (in-filter) set.
  const selectedItem = matched.find((i) => i.id === selectedId) ?? matched[0] ?? null;
  const selectedIndex = selectedItem ? matched.indexOf(selectedItem) : -1;
  const cycle = (delta: number) => {
    if (matched.length === 0) return;
    const next = (selectedIndex + delta + matched.length) % matched.length;
    setSelectedId((matched[next] as ExploreItem).id);
  };

  const chips = activeFilterChips(filters);
  const active = hasActiveFilters(filters);
  const toggle = (dimension: FilterChip['dimension'], value: string) =>
    setFilters(toggleFilterValue(filters, dimension, value));

  const countries = useMemo(() => facetOptions(entities, 'country'), [entities]);
  const regions = useMemo(() => facetOptions(entities, 'region'), [entities]);
  const kinds = useMemo(() => {
    const present = new Set(entities.map((e) => e.kind));
    return [...present].map((k) => ({ value: k, label: KIND_LABELS[k] }));
  }, [entities]);

  return (
    <>
      <section className="relative w-full overflow-hidden bg-map-base" aria-label="Explore trails">
        <div className="relative h-[calc(100svh-var(--topbar-h))] min-h-[460px] w-full">
          <HeroMap
            routes={routes}
            matchedIds={matchedIds}
            selectedId={selectedItem?.id ?? null}
            onSelect={setSelectedId}
          />

          {selectedItem ? (
            <TrailCarousel
              item={{
                title: selectedItem.card.title,
                subtitle: selectedItem.card.subtitle,
                image: selectedItem.card.image,
                href: selectedItem.card.href,
                stats: selectedItem.stats,
                elevation: selectedItem.elevation,
                description: selectedItem.description,
                facts: selectedItem.facts,
              }}
              index={selectedIndex}
              total={matched.length}
              onPrev={() => cycle(-1)}
              onNext={() => cycle(1)}
            />
          ) : (
            <div className="pointer-events-auto absolute right-6 bottom-6 hidden w-[340px] max-w-[34vw] flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-[0_12px_28px_rgba(0,0,0,0.16)] lg:flex">
              <p className="font-display text-[16px] font-semibold text-primary">No trails match</p>
              <button
                type="button"
                onClick={() => setFilters({})}
                className="w-fit font-body text-[14px] font-semibold text-accent hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Pitch / CTA card — the design's hero card, on the left of the map. */}
          <div className="pointer-events-auto absolute left-6 top-1/2 hidden w-[400px] max-w-[34vw] -translate-y-1/2 flex-col gap-[18px] rounded-2xl border border-line bg-surface/95 p-8 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur lg:flex">
            <p className="label-mono text-[9.5px] text-secondary">Long-distance hiking</p>
            <h1 className="font-display text-[34px] font-semibold leading-[1.16] tracking-[-0.34px] text-primary">
              Every great trail, in your pocket.
            </h1>
            <p className="font-body text-[16px] leading-[1.45] text-secondary">
              Plan, navigate and finish the world’s great long-distance hikes. Offline maps and an
              on-device guide that knows every refuge, spring and junction.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button href="/contact" variant="solid" size="lg">
                Get the app
              </Button>
              <Button href="#popular-trails" variant="outline" size="lg">
                Browse trails
              </Button>
            </div>
          </div>

          {/* Floating controls. Wrapper is click-through; children opt back in. */}
          <div className="pointer-events-none absolute left-1/2 top-4 flex w-[560px] max-w-[92vw] -translate-x-1/2 flex-col gap-3">
            {/* Search trigger → modal */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-surface px-[14px] py-[11px] text-left shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
            >
              <Search size={18} className="shrink-0 text-secondary" />
              <span className="flex-1 font-body text-[15px] text-secondary">
                Search trails, peaks and places…
              </span>
            </button>

            {/* Filter bar + popup (click-away dismisses) */}
            <div
              ref={filterRef}
              className="pointer-events-auto relative flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-[14px] py-2 text-[13px] font-semibold ${
                  filterOpen || active
                    ? 'border-transparent bg-accent text-on-accent'
                    : 'border-line bg-surface text-primary'
                }`}
              >
                <ListFilter size={16} />
                Filters
              </button>
              {chips.map((chip) => (
                <button
                  key={`${chip.dimension}:${chip.value}`}
                  type="button"
                  onClick={() => toggle(chip.dimension, chip.value)}
                  title="Remove filter"
                >
                  <Chip label={`${chip.label}  ✕`} selected />
                </button>
              ))}

              {filterOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-10 flex max-h-[60vh] w-[560px] max-w-[92vw] flex-col gap-5 overflow-auto rounded-2xl border border-line bg-surface p-5 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-[18px] font-semibold text-primary">Filters</p>
                    <button
                      type="button"
                      onClick={() => setFilters({})}
                      className="font-body text-[13px] font-semibold text-secondary hover:text-primary"
                    >
                      Reset
                    </button>
                  </div>

                  {kinds.length > 1 && (
                    <FilterGroup title="Type">
                      {kinds.map((k) => (
                        <ChipToggle
                          key={k.value}
                          label={k.label}
                          selected={filters.kinds?.includes(k.value as MapEntity['kind']) ?? false}
                          onClick={() => toggle('kinds', k.value)}
                        />
                      ))}
                    </FilterGroup>
                  )}
                  {countries.length > 0 && (
                    <FacetGroup
                      title="Country"
                      options={countries}
                      selected={filters.countries}
                      onToggle={(v) => toggle('countries', v)}
                    />
                  )}
                  {regions.length > 0 && (
                    <FacetGroup
                      title="Mountain range"
                      options={regions}
                      selected={filters.regions}
                      onToggle={(v) => toggle('regions', v)}
                    />
                  )}
                  <FilterGroup title="Difficulty">
                    {DIFFICULTIES.map((d) => (
                      <ChipToggle
                        key={d.id}
                        label={d.label}
                        selected={filters.difficulty?.includes(d.id) ?? false}
                        onClick={() => toggle('difficulty', d.id)}
                      />
                    ))}
                  </FilterGroup>
                  <FilterGroup title="Duration">
                    {DURATION_BANDS.map((b) => (
                      <ChipToggle
                        key={b.id}
                        label={b.label}
                        selected={filters.duration?.includes(b.id) ?? false}
                        onClick={() => toggle('duration', b.id)}
                      />
                    ))}
                  </FilterGroup>
                  <FilterGroup title="Distance">
                    {DISTANCE_BANDS.map((b) => (
                      <ChipToggle
                        key={b.id}
                        label={b.label}
                        selected={filters.distance?.includes(b.id) ?? false}
                        onClick={() => toggle('distance', b.id)}
                      />
                    ))}
                  </FilterGroup>

                  <div className="sticky bottom-0 -mx-5 -mb-5 mt-1 border-t border-line bg-surface px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      className="w-full rounded-[10px] bg-accent px-[22px] py-[13px] font-display text-[16px] font-semibold text-on-accent"
                    >
                      Show {matched.length} {matched.length === 1 ? 'trail' : 'trails'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {searchOpen && <SearchModal items={items} onClose={() => setSearchOpen(false)} />}
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="label-mono text-[9.5px] text-secondary">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FacetGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: FacetOption[];
  selected?: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <FilterGroup title={title}>
      {options.map((o) => (
        <ChipToggle
          key={o.value}
          label={o.label}
          selected={selected?.includes(o.value) ?? false}
          onClick={() => onToggle(o.value)}
        />
      ))}
    </FilterGroup>
  );
}

function ChipToggle({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}>
      <Chip label={label} selected={selected} />
    </button>
  );
}
