import type { ExploreCard } from '@/lib/content';
import type { OsmcSymbol } from '@roam/core';
import { SectionHeader } from './SectionHeader';
import { TrailCard } from './TrailCard';

// A titled 3-up card grid (collapses to 1 column on mobile, 2 on tablet). The
// optional `symbols` map keys a parsed waymark onto a card by title (used to
// paint the live GR11 blaze on its Popular-trails card).
export function CardSection({
  id,
  eyebrow,
  title,
  cards,
  imageHeight = 160,
  symbols,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  cards: ExploreCard[];
  imageHeight?: number;
  symbols?: Record<string, OsmcSymbol | null>;
}) {
  return (
    <section id={id} className="w-full px-6 py-14 md:px-20">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-7">
        <SectionHeader eyebrow={eyebrow} title={title} />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <TrailCard
              key={card.title}
              card={card}
              imageHeight={imageHeight}
              symbol={symbols?.[card.title]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
