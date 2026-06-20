import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with Roam — questions, trail corrections, or to hear when the app ships.',
  alternates: { canonical: '/contact' },
};

const EMAIL = 'hello@roamhike.com';

export default function ContactPage() {
  return (
    <>
      <Header />
      <main>
        <section className="w-full px-6 py-20 md:px-[120px] h-full">
          <div className="mx-auto flex max-w-[720px] flex-col gap-5">
            <p className="label-mono text-[12px] text-accent">Contact</p>
            <h1 className="font-display text-[44px] font-semibold leading-[1.05] tracking-[-0.5px] text-primary">
              Get in touch
            </h1>
            <p className="font-body text-[18px] leading-[1.6] text-secondary">
              Questions, a refuge that’s moved, a spring that’s run dry, or you just want to hear
              when the app ships — we read everything.
            </p>
            <a
              href={`mailto:${EMAIL}`}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-[10px] bg-accent px-[22px] py-[15px] font-display text-[16px] font-semibold tracking-[-0.08px] text-on-accent transition-colors hover:bg-accent/90"
            >
              {EMAIL}
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
