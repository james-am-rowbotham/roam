import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="w-full bg-primary">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-6 py-9 sm:flex-row md:px-20">
        <Logo tone="cream" />
        <div className="flex items-center gap-7 text-on-accent">
          <Link href="/about" className="font-body text-[13px] hover:underline">
            About
          </Link>
          <Link href="/contact" className="font-body text-[13px] hover:underline">
            Contact
          </Link>
          <span className="label-mono text-[9.5px] tracking-[0.12em] text-on-accent/80">
            Made for the trail · Amsterdam
          </span>
        </div>
      </div>
    </footer>
  );
}
