import type { Metadata } from 'next';
import { Bricolage_Grotesque, Geist_Mono, Hanken_Grotesk } from 'next/font/google';
import './globals.css';

// The three faces of the Roam type system (§16). next/font self-hosts them
// (no layout shift, no third-party request) and exposes each as a CSS variable
// that globals.css binds to --font-display / --font-body / --font-mono.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-bricolage',
  display: 'swap',
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hanken',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://roamhike.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Roam — Every great trail, in your pocket',
    template: '%s · Roam',
  },
  description:
    'Plan, navigate and finish the world’s great long-distance hikes. Offline maps and an on-device guide that knows every refuge, spring and junction — starting with the GR11 across the Pyrenees.',
  keywords: [
    'GR11',
    'Senda Pirenaica',
    'long-distance hiking',
    'Pyrenees trek',
    'offline hiking maps',
    'thru-hiking app',
    'trail guide',
  ],
  authors: [{ name: 'Roam' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Roam',
    url: siteUrl,
    title: 'Roam — Every great trail, in your pocket',
    description:
      'Offline maps, a guide that walks with you, and water you can trust. Start with the GR11 across the Pyrenees, sea to sea.',
    // og:image is provided by app/opengraph-image.tsx (generated, not bundled).
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roam — Every great trail, in your pocket',
    description:
      'Offline maps, a guide that walks with you, and water you can trust. Start with the GR11 across the Pyrenees.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${hanken.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
