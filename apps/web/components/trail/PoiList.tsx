// A simple titled list of points of interest (water, accommodation, hazards)
// within a stage or region's span. Returns null when empty so callers can drop
// the section entirely.
export interface PoiRow {
  id: string;
  name: string;
  meta?: string;
  tag?: string;
}

export function PoiList({ title, items }: { title: string; items: PoiRow[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <p className="label-mono text-[11px] text-accent">{title}</p>
      <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
        {items.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
          >
            <span className="min-w-0 flex-1 truncate font-body text-[15px] text-primary">
              {p.name}
            </span>
            {p.meta && <span className="font-mono text-[12px] text-secondary">{p.meta}</span>}
            {p.tag && (
              <span className="rounded-full border border-line px-2 py-0.5 font-body text-[12px] text-secondary">
                {p.tag}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
