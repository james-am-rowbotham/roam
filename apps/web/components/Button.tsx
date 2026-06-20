import Link from 'next/link';

type Variant = 'solid' | 'outline' | 'onAccent';
type Size = 'md' | 'lg';

// Mirrors the app's Button (§16): Solid (green), Outline, plus an onAccent
// variant (white pill on the green CTA band). Renders as a Link so it stays a
// real, crawlable anchor for SEO.
const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-semibold tracking-[-0.08px] transition-colors';

const sizes: Record<Size, string> = {
  md: 'px-[18px] py-3 text-[15px] rounded-lg',
  lg: 'px-[22px] py-[15px] text-[16px] rounded-[10px]',
};

const variants: Record<Variant, string> = {
  solid: 'bg-accent text-on-accent hover:bg-accent/90',
  outline: 'bg-surface text-primary border border-line hover:bg-subtle',
  onAccent: 'bg-white text-accent rounded-full hover:bg-white/90 font-body',
};

export function Button({
  href,
  children,
  variant = 'solid',
  size = 'md',
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
}) {
  return (
    <Link href={href} className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {children}
    </Link>
  );
}
