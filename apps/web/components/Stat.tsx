// A single labelled statistic — a mono value over a small uppercase label.
// Shared by the at-a-glance band (md) and the map trail-card popup (sm) so the
// stat treatment is identical wherever trail basics appear.
export interface StatItem {
  value: string;
  label: string;
}

const SIZES = {
  sm: { value: 'text-[16px]', label: 'text-[9.5px]' },
  md: { value: 'text-[30px]', label: 'text-[12px]' },
} as const;

export function Stat({ value, label, size = 'md' }: StatItem & { size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  return (
    <div className="flex flex-col gap-1">
      <span className={`font-mono ${s.value} leading-none text-primary`}>{value}</span>
      <span className={`label-mono ${s.label} text-secondary`}>{label}</span>
    </div>
  );
}
