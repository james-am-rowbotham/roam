// Eyebrow (mono, tracked, accent) + display heading — the repeated section
// header from the Figma frame (POPULAR TRAILS / Start with a classic).
export function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="label-mono text-[12px] text-accent">{eyebrow}</p>
      <h2 className="font-display text-[30px] font-semibold leading-[1.1] text-primary">{title}</h2>
    </div>
  );
}
