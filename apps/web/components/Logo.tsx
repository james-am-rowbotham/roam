// The Roam wordmark: the blaze mark (cream over red bars) + "roam" in Bricolage.
// `tone` switches it for light vs dark (footer) backgrounds.
export function Logo({ tone = 'accent' }: { tone?: 'accent' | 'cream' }) {
  const wordClass = tone === 'cream' ? 'text-blaze-cream' : 'text-accent';
  return (
    <span className="inline-flex items-center gap-[6px]" aria-label="Roam">
      <span className="relative block h-[13px] w-[19px]" aria-hidden>
        <span className="absolute inset-x-0 top-0 h-[42%] rounded-[2px] border border-black/10 bg-blaze-cream" />
        <span className="absolute inset-x-0 bottom-0 h-[42%] rounded-[2px] bg-blaze-red" />
      </span>
      <span
        className={`font-display text-[24px] font-bold lowercase tracking-[-0.36px] leading-none ${wordClass}`}
      >
        roam
      </span>
    </span>
  );
}
