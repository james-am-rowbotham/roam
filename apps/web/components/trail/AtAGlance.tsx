import { Stat, type StatItem } from '@/components/Stat';

// The at-a-glance stat band under the hero: big mono numbers + small labels.
export function AtAGlance({ stats }: { stats: StatItem[] }) {
  return (
    <section className="w-full border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-wrap gap-x-16 gap-y-6 px-6 py-11 md:px-[120px]">
        {stats.map((s) => (
          <Stat key={s.label} value={s.value} label={s.label} size="md" />
        ))}
      </div>
    </section>
  );
}
