'use client';

import { useDismiss } from '@/lib/useDismiss';
import { KIND_LABELS, type MapEntityKind, matchesQuery } from '@roam/core';
import { Droplet, House, type LucideIcon, MapPin, Mountain, Route, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExploreItem } from './MapExplore';

const KIND_ICON: Record<MapEntityKind, LucideIcon> = {
  trail: Route,
  peak: Mountain,
  refuge: House,
  water: Droplet,
  poi: MapPin,
};

const GROUP_ORDER: MapEntityKind[] = ['trail', 'peak', 'refuge', 'water', 'poi'];
const GROUP_LABEL: Record<MapEntityKind, string> = {
  trail: 'Trails',
  peak: 'Peaks',
  refuge: 'Refuges',
  water: 'Water',
  poi: 'Places',
};

// Full-screen search overlay (Figma screen 02). Live results from the shared
// engine's matchesQuery, grouped by kind, each linking to its page. Dismisses on
// backdrop click / Escape.
export function SearchModal({ items, onClose }: { items: ExploreItem[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useDismiss(panelRef, onClose);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const groups = useMemo(() => {
    const matched = items.filter((i) => matchesQuery(i.entity, query));
    return GROUP_ORDER.map((kind) => ({
      kind,
      items: matched.filter((i) => i.entity.kind === kind),
    })).filter((g) => g.items.length > 0);
  }, [items, query]);

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-overlay-dark px-4 pt-[10vh]">
      <div
        ref={panelRef}
        className="flex max-h-[80vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-line bg-app shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-center gap-2 border-b border-line p-4">
          <Search size={18} className="shrink-0 text-secondary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trails, peaks, refuges…"
            className="flex-1 bg-transparent font-body text-[17px] text-primary outline-none placeholder:text-secondary"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-1 text-secondary hover:text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-auto">
          {groups.length === 0 ? (
            <p className="px-4 py-10 text-center font-body text-[15px] text-secondary">
              No matches for “{query}”.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.kind}>
                <p className="label-mono px-4 pt-6 pb-1.5 text-[9.5px] text-secondary">
                  {GROUP_LABEL[group.kind]}
                </p>
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.card.href}
                    onClick={onClose}
                    className="flex items-center gap-3 border-b border-line px-4 py-2.5 hover:bg-subtle"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-subtle text-secondary">
                      <KindIcon kind={item.entity.kind} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-display text-[15px] font-semibold text-primary">
                        {item.entity.name}
                      </span>
                      <span className="truncate font-body text-[13px] text-secondary">
                        {item.card.subtitle}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-body text-[13px] text-secondary">
                      {KIND_LABELS[item.entity.kind]}
                    </span>
                  </Link>
                ))}
              </div>
            ))
          )}
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}

function KindIcon({ kind }: { kind: MapEntityKind }) {
  const Icon = KIND_ICON[kind];
  return <Icon size={18} />;
}
