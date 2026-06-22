import type { ExploreCard } from '@/lib/content';
import type { OsmcSymbol } from '@roam/core';
import Link from 'next/link';
import { CardImage } from './CardImage';
import { Waymark } from './Waymark';

// A single explore card (trail / country / mountain range). `imageHeight` is the
// only structural difference (popular trails use a taller 210px photo, browse
// tiles 160px). When a parsed waymark is supplied (a trail), the painted blaze
// sits on the photo. Every card links somewhere real.
export function TrailCard({
  card,
  imageHeight = 160,
  symbol,
}: {
  card: ExploreCard;
  imageHeight?: number;
  symbol?: OsmcSymbol | null;
}) {
  return (
    <Link href={card.href} className="block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.10)]">
        <div className="relative w-full" style={{ height: imageHeight }}>
          <CardImage src={card.image} alt={card.title} height={imageHeight} />
          {symbol && (
            <span className="absolute left-3 top-3 drop-shadow-sm">
              <Waymark symbol={symbol} size={30} />
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5 px-[18px] pb-[18px] pt-4">
          {card.eyebrow && <p className="label-mono text-[11px] text-primary">{card.eyebrow}</p>}
          <h3 className="font-body text-[19px] font-semibold text-primary">{card.title}</h3>
          <p className="font-mono text-[12px] tracking-[0.02em] text-secondary">{card.subtitle}</p>
        </div>
      </article>
    </Link>
  );
}
