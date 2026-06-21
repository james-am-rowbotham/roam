import type { ContentBlock } from '@/lib/api';

// The web read-layer renderer (§21.9) — the cousin of the app's
// ContentBlockRenderer. Renders the DB content_blocks (narrative / fact /
// callout / media / what_you_see / faq) grouped by reading lens, matching the
// content the mobile app shows.

const LENS_LABELS: Record<string, string> = {
  terrain: 'Terrain',
  flora: 'Flora',
  fauna: 'Fauna',
  flora_fauna: 'Flora & fauna',
  culture: 'Culture',
  customs: 'Customs',
  kit: 'Recommended kit',
  season: 'Time of year',
  places: 'Places to visit',
};

function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  if (blocks.length === 0) return null;

  // Group by lens, preserving first-seen order.
  const order: string[] = [];
  const byLens = new Map<string, ContentBlock[]>();
  for (const b of blocks) {
    const list = byLens.get(b.lens);
    if (list) list.push(b);
    else {
      byLens.set(b.lens, [b]);
      order.push(b.lens);
    }
  }

  return (
    <div className="flex flex-col gap-12">
      {order.map((lens) => (
        <section key={lens} className="flex flex-col gap-5">
          <h3 className="font-display text-[22px] font-semibold text-primary">
            {LENS_LABELS[lens] ?? lens}
          </h3>
          {(byLens.get(lens) ?? []).map((b) => (
            <Block key={b.id} block={b} />
          ))}
        </section>
      ))}
    </div>
  );
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.blockType) {
    case 'callout':
      return (
        <aside className="rounded-lg border border-line border-l-[3px] border-l-accent bg-subtle px-5 py-4">
          {block.title && (
            <p className="font-body text-[15px] font-semibold text-primary">{block.title}</p>
          )}
          <Prose body={block.body} className="text-secondary" />
        </aside>
      );
    case 'fact':
      return (
        <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface px-5 py-4">
          {block.title && <p className="label-mono text-[10px] text-accent">{block.title}</p>}
          <Prose body={block.body} className="text-primary" />
        </div>
      );
    case 'what_you_see':
      return (
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="label-mono mb-2 text-[10px] text-secondary">What you’re seeing</p>
          {block.title && (
            <p className="font-display text-[17px] font-semibold text-primary">{block.title}</p>
          )}
          <Prose body={block.body} className="text-secondary" />
        </div>
      );
    case 'faq':
      return (
        <details className="group rounded-lg border border-line bg-surface px-5 py-3.5">
          <summary className="cursor-pointer list-none font-body text-[16px] font-semibold text-primary marker:hidden">
            {block.title ?? 'More'}
          </summary>
          <Prose body={block.body} className="mt-2 text-secondary" />
        </details>
      );
    default:
      // narrative + media (caption text) render as prose with an optional heading.
      return (
        <div className="flex flex-col gap-2">
          {block.title && (
            <h4 className="font-display text-[18px] font-semibold text-primary">{block.title}</h4>
          )}
          <Prose body={block.body} className="text-secondary" />
        </div>
      );
  }
}

function Prose({ body, className = '' }: { body: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {paragraphs(body).map((p, i) => (
        <p
          // biome-ignore lint/suspicious/noArrayIndexKey: static prose paragraphs, stable order
          key={i}
          className="font-body text-[16px] leading-[1.6]"
        >
          {p}
        </p>
      ))}
    </div>
  );
}
