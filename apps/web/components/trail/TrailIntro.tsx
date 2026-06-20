import { Waymark } from '@/components/Waymark';
import type { TrailListItem } from '@/lib/api';

// "Why walk …" narrative + an AT A GLANCE facts card. Prose is composed from the
// trail's own facts (the rich editorial read layer is a later pipeline stage,
// §21) so nothing here is invented. The waymark fact reuses the painted blaze.
export function TrailIntro({
  trail,
  paragraphs,
  facts,
}: {
  trail: TrailListItem;
  paragraphs: string[];
  facts: { label: string; value: string }[];
}) {
  return (
    <section className="w-full px-6 py-16 md:px-[120px]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-12 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-[34px] font-semibold leading-[1.1] text-primary">
            Why walk the {trail.ref ?? trail.name}
          </h2>
          {paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className="font-body text-[17px] leading-[1.55] text-secondary">
              {p}
            </p>
          ))}
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-surface p-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="label-mono text-[12px] text-secondary">At a glance</p>
            {trail.waymark.symbol && <Waymark symbol={trail.waymark.symbol} size={26} />}
          </div>
          <dl>
            {facts.map((f, i) => (
              <div
                key={f.label}
                className={`flex items-baseline justify-between gap-4 py-3 ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                <dt className="font-body text-[14px] text-secondary">{f.label}</dt>
                <dd className="text-right font-body text-[14px] font-semibold text-primary">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}
