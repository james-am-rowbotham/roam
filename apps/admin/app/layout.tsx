import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Roam Admin — content curation',
  robots: { index: false, follow: false },
};

// The internal curation tool (§8 stage 4) — review content before publish, edit, approve.
// Server-rendered over @roam/db. NOTE: this is unauthenticated for now; gate with Supabase
// Auth before deploying anywhere reachable (P3 follow-up).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            borderBottom: '1px solid var(--color-border-default, rgba(58,51,40,0.13))',
            padding: '12px 24px',
            display: 'flex',
            gap: 16,
            alignItems: 'baseline',
          }}
        >
          <Link href="/" style={{ fontWeight: 700, textDecoration: 'none', color: 'inherit' }}>
            Roam Admin
          </Link>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary, #6f6a60)' }}>
            content curation
          </span>
        </header>
        <main style={{ maxWidth: 980, margin: '0 auto', padding: '24px' }}>{children}</main>
      </body>
    </html>
  );
}
