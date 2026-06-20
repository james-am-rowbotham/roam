import { CtaBand } from '@/components/CtaBand';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Roam is an offline-first companion for the world’s great long-distance hikes — starting with the GR11 and GR10 across the Pyrenees.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <section className="w-full px-6 py-20 md:px-[120px]">
          <div className="mx-auto flex max-w-[720px] flex-col gap-5">
            <p className="label-mono text-[12px] text-accent">About</p>
            <h1 className="font-display text-[44px] font-semibold leading-[1.05] tracking-[-0.5px] text-primary">
              Made for the trail
            </h1>
            <p className="font-body text-[18px] leading-[1.6] text-secondary">
              Roam turns a long-distance route into a personal, offline-capable journey. Pick a
              trail, set your pace and accommodation style, and Roam groups its curated stages into
              days and suggests where to sleep.
            </p>
            <p className="font-body text-[17px] leading-[1.6] text-secondary">
              On the trail, a full-screen map shows the route, your position and the nearby water
              and refuges — all working with zero connectivity. A Guide answers the questions that
              matter underway: where’s the next water, will I reach the refuge before dark.
            </p>
            <p className="font-body text-[17px] leading-[1.6] text-secondary">
              We’re going deep before we go wide. The GR11 and GR10 across the Pyrenees come first,
              hand-finished and kept honest by the hikers who walk them — the people at the spring
              are the best sensors there are.
            </p>
          </div>
        </section>
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
