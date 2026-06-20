import type { SymbolMap } from '@/lib/browse';
import type { ExploreCard } from '@/lib/content';
import { CtaBand } from './CtaBand';
import { Footer } from './Footer';
import { Header } from './Header';
import { TrailCard } from './TrailCard';

// A listing page body shared by the country and place (mountain-range) routes:
// header, an eyebrow + title + description band, a grid of trail cards, the CTA
// band and footer. Empty states are avoided upstream — these pages only render
// for facets that have trails.
export function TrailBrowse({
  eyebrow,
  title,
  description,
  cards,
  symbols,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  cards: ExploreCard[];
  symbols?: SymbolMap;
}) {
  return (
    <>
      <Header />
      <main>
        <section className="w-full px-6 pt-16 pb-4 md:px-[120px]">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-3">
            <p className="label-mono text-[12px] text-accent">{eyebrow}</p>
            <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.5px] text-primary">
              {title}
            </h1>
            {description && (
              <p className="max-w-[680px] font-body text-[17px] leading-[1.5] text-secondary">
                {description}
              </p>
            )}
          </div>
        </section>
        <section className="w-full px-6 py-10 md:px-[120px]">
          <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <TrailCard
                key={card.title}
                card={card}
                imageHeight={210}
                symbol={symbols?.[card.title]}
              />
            ))}
          </div>
        </section>
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
