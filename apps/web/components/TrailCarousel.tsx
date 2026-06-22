import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ElevationProfile } from './ElevationProfile';
import { Stat, type StatItem } from './Stat';

export interface CarouselItem {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  href: string;
  stats: StatItem[];
  elevation: number[];
  description?: string | null;
  facts?: StatItem[];
}

// The selected-trail panel on the right of the map: a picture, the trail's
// stats and elevation, and a link to its guide. Prev/next cycle through the
// trails currently on the map; selecting also highlights the trail.
export function TrailCarousel({
  item,
  index,
  total,
  onPrev,
  onNext,
}: {
  item: CarouselItem;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute right-6 bottom-6 hidden max-h-[80vh] w-[340px] max-w-[34vw] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_12px_28px_rgba(0,0,0,0.16)] lg:flex">
      <div className="relative h-[128px] w-full shrink-0">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- small map-overlay thumbnail, not worth next/image here
          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-map-green via-map-base to-map-contour" />
        )}
        {total > 1 && (
          <>
            <CarouselArrow side="left" onClick={onPrev} />
            <CarouselArrow side="right" onClick={onNext} />
            <span className="absolute bottom-2 right-2 rounded-full bg-primary/80 px-2 py-0.5 font-mono text-[11px] text-white">
              {index + 1} / {total}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto p-4">
        <div className="flex flex-col gap-0.5">
          <p className="label-mono text-[11px] text-primary">
            {item.eyebrow ?? 'Trail'}
            {item.subtitle ? ` · ${item.subtitle}` : ''}
          </p>
          <h3 className="font-display text-[19px] font-semibold leading-tight text-primary">
            {item.title}
          </h3>
        </div>

        <div className="flex gap-4">
          {item.stats.map((s) => (
            <Stat key={s.label} value={s.value} label={s.label} size="sm" />
          ))}
        </div>

        {item.elevation.length > 1 && <ElevationProfile data={item.elevation} height={56} />}

        {(item.description || (item.facts && item.facts.length > 0)) && (
          <details className="group border-t border-line pt-2">
            <summary className="flex cursor-pointer list-none items-center justify-between font-body text-[14px] font-semibold text-primary [&::-webkit-details-marker]:hidden">
              Read more
              <ChevronDown
                size={16}
                className="text-secondary transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="mt-2 flex flex-col gap-3">
              {item.description && (
                <p className="font-body text-[14px] leading-[1.55] text-secondary">
                  {item.description}
                </p>
              )}
              {item.facts && item.facts.length > 0 && (
                <dl className="flex flex-col">
                  {item.facts.map((f, i) => (
                    <div
                      key={f.label}
                      className={`flex items-center justify-between py-1.5 ${i > 0 ? 'border-t border-line' : ''}`}
                    >
                      <dt className="font-body text-[13px] text-secondary">{f.label}</dt>
                      <dd className="font-body text-[13px] font-semibold text-primary">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </details>
        )}

        <Link
          href={item.href}
          className="font-body text-[15px] font-semibold text-accent hover:underline"
        >
          View guide →
        </Link>
      </div>
    </div>
  );
}

function CarouselArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous trail' : 'Next trail'}
      className={`absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface/95 text-primary shadow-[0_2px_6px_rgba(0,0,0,0.2)] hover:bg-surface ${
        side === 'left' ? 'left-2' : 'right-2'
      }`}
    >
      {side === 'left' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  );
}
