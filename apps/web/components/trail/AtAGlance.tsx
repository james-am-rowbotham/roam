import { Stat, type StatItem } from '@/components/Stat';

// The at-a-glance stat strip under the hero — shared by the trail, region and
// stage pages. Mirrors the mobile `StatPills` (§16): each stat is an equal-width
// cell, centred, separated by a hairline divider, so the numbers spread evenly
// across the full width instead of bunching at the left.
export function AtAGlance({ stats }: { stats: StatItem[] }) {
  return (
    <section className="w-full border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1440px] items-center px-6 py-9 md:px-[120px]">
        {stats.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center">
            {i > 0 && <span className="h-8 w-px shrink-0 bg-line" />}
            <div className="flex-1">
              <Stat value={s.value} label={s.label} size="md" align="center" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
