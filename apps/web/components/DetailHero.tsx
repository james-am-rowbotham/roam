import Image from 'next/image';

// A full-bleed detail hero shared by the region and stage pages: cover image,
// scrim, mono kicker, title and an optional lede — matching the mobile
// section/stage hero. The stat strip lives below it (<AtAGlance>), not on the
// image, so the numbers spread evenly across the full width.
export function DetailHero({
  image,
  kicker,
  title,
  lede,
}: {
  image?: string | null;
  kicker: string;
  title: string;
  lede?: string | null;
}) {
  return (
    <section className="relative w-full overflow-hidden bg-map-base">
      <div className="relative h-[380px] w-full md:h-[440px]">
        {image && (
          <Image src={image} alt={title} fill priority sizes="100vw" className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-6 pb-12 md:px-20">
            <p className="label-mono text-[12px] text-on-accent/85">{kicker}</p>
            <h1 className="max-w-[820px] font-display text-[40px] font-semibold leading-[1.06] tracking-[-0.5px] text-on-accent md:text-[48px]">
              {title}
            </h1>
            {lede && (
              <p className="max-w-[680px] font-body text-[16px] leading-[1.5] text-on-accent/85">
                {lede}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
