// Option chip (§16) — the hero filter pills. Selected = green fill.
export function Chip({ label, selected = false }: { label: string; selected?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-[14px] py-2 text-[13px] font-semibold ${
        selected ? 'bg-accent text-on-accent' : 'border border-line bg-surface text-primary'
      }`}
    >
      {label}
    </span>
  );
}
