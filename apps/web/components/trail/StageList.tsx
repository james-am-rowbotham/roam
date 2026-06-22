import type { TrailSection } from '@/lib/api';
import { km, meters } from '@/lib/format';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

// A list of stages (etapas) as rows, linking to each stage's detail page —
// mirrors the mobile section's Stages tab. `slug` is the trail slug for the link.
export function StageList({ slug, stages }: { slug: string; stages: TrailSection[] }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      {stages.map((s, i) => {
        const dist = Math.abs(s.endChainageM - s.startChainageM);
        const meta = [`${km(dist)} km`, s.ascentM != null ? `${meters(s.ascentM)} ↑` : null]
          .filter(Boolean)
          .join(' · ');
        return (
          <Link
            key={s.id}
            href={`/trails/${slug}/stages/${s.id}`}
            className={`flex items-center gap-4 px-4 py-3.5 hover:bg-subtle ${
              i > 0 ? 'border-t border-line' : ''
            }`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle font-mono text-[13px] text-secondary">
              {s.orderIndex}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="label-mono text-[10px] text-primary">Stage {s.orderIndex}</span>
              <span className="truncate font-body text-[15px] font-semibold text-primary">
                {s.name}
              </span>
              <span className="font-mono text-[12px] tracking-[0.02em] text-secondary">{meta}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-secondary" />
          </Link>
        );
      })}
    </div>
  );
}
