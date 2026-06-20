import { Button } from './Button';

export function CtaBand() {
  return (
    <section id="cta" className="w-full bg-accent px-6 py-[92px] md:px-20">
      <div className="mx-auto flex max-w-[680px] flex-col items-center gap-[18px] text-center">
        <h2 className="font-display text-[40px] font-semibold leading-[1.08] text-on-accent">
          Every great trail, in your pocket
        </h2>
        <p className="font-body text-[17px] leading-[1.45] text-on-accent/85">
          Offline maps, a guide that walks with you, and water you can trust. iOS and Android.
        </p>
        <Button href="/contact" variant="onAccent" size="lg">
          Get the app →
        </Button>
      </div>
    </section>
  );
}
