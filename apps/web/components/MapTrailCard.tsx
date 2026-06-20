import { Stat, type StatItem } from './Stat';

// The popup card rendered on the map for a trail (replaces the bare ref chip):
// a small cover image, the trail name, and the shared Stat component with the
// trail basics. It's an anchor so tapping the card opens the trail guide. Uses a
// plain <img> and <a> because it is rendered into a detached MapLibre marker
// root, outside Next's component tree.
export interface MapTrailCardProps {
  title: string;
  subtitle?: string;
  image?: string | null;
  href: string;
  stats: StatItem[];
}

export function MapTrailCard({ title, subtitle, image, href, stats }: MapTrailCardProps) {
  return (
    <a
      href={href}
      className="block w-[228px] overflow-hidden rounded-xl border border-line bg-surface no-underline shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
    >
      {image ? (
        <img src={image} alt={title} className="h-[92px] w-full object-cover" />
      ) : (
        <div className="h-[92px] w-full bg-gradient-to-br from-map-green via-map-base to-map-contour" />
      )}
      <div className="flex flex-col gap-2.5 p-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-[15px] font-semibold leading-tight text-primary">
            {title}
          </span>
          {subtitle && <span className="font-mono text-[11px] text-secondary">{subtitle}</span>}
        </div>
        <div className="flex gap-4">
          {stats.map((s) => (
            <Stat key={s.label} value={s.value} label={s.label} size="sm" />
          ))}
        </div>
      </div>
    </a>
  );
}
