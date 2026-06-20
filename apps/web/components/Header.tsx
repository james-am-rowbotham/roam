import { navLinks } from '@/lib/content';
import Link from 'next/link';
import { Button } from './Button';
import { Logo } from './Logo';

export function Header() {
  return (
    <header className="w-full border-b border-line/60 bg-app/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-[22px] md:px-20">
        <Link href="/" aria-label="Roam home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-8">
          <ul className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="font-body text-[14px] font-medium text-secondary transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Button href="/#cta" variant="solid" size="md">
            Get the app
          </Button>
        </nav>
      </div>
    </header>
  );
}
