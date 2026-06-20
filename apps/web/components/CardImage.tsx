import Image from 'next/image';

// Card cover image. Photographic imagery is always DB-sourced (an `imageUrl`
// from the API / R2) — we never bundle trail photos in the repo. When a card has
// no image, it falls back to a themed terrain gradient placeholder rather than a
// committed stock photo.
export function CardImage({
  src,
  alt,
  height,
}: {
  src?: string | null;
  alt: string;
  height: number;
}) {
  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 384px"
          className="object-cover"
        />
      ) : (
        <div
          className="h-full w-full bg-gradient-to-br from-map-green via-map-base to-map-contour"
          aria-hidden
        />
      )}
    </div>
  );
}
