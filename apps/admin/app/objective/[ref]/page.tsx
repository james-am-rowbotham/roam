import Link from 'next/link';
import { notFound } from 'next/navigation';
import { editForm, statusForm } from '../../../lib/actions';
import { type BlockRow, getObjectiveContent, storedHeading, storedText } from '../../../lib/data';

export const dynamic = 'force-dynamic';

const STATUS_COLOR: Record<string, string> = {
  draft: '#6f6a60',
  reviewed: '#854f0b',
  published: '#3d5a3f',
  flagged: '#a32d2d',
};

// One trail's content blocks, grouped by scope, with provenance + the review workflow.
export default async function ObjectiveReview({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const trailRef = decodeURIComponent(ref);
  const data = await getObjectiveContent(trailRef);
  if (!data) notFound();

  // Group by scope (route / region:id / stage:id) for a readable layout.
  const groups = new Map<string, BlockRow[]>();
  for (const b of data.blocks) {
    const key = b.scopeType === 'route' ? 'Trail overview' : `${b.scopeType} ${b.scopeId}`;
    const list = groups.get(key) ?? [];
    list.push(b);
    groups.set(key, list);
  }

  return (
    <div>
      <p style={{ marginBottom: 4 }}>
        <Link href="/">← Trails</Link>
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        {data.name}{' '}
        <span style={{ color: '#6f6a60', fontSize: 14 }}>· {data.blocks.length} blocks</span>
      </h1>

      {[...groups.entries()].map(([group, blocks]) => (
        <section key={group} style={{ marginBottom: 28 }}>
          <h2
            style={{
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: '#6f6a60',
              marginBottom: 8,
            }}
          >
            {group}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {blocks.map((b) => (
              <BlockCard key={b.id} b={b} trailRef={trailRef} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function BlockCard({ b, trailRef }: { b: BlockRow; trailRef: string }) {
  const text = storedText(b.block);
  return (
    <article
      style={{
        border: '1px solid rgba(58,51,40,0.13)',
        borderRadius: 8,
        background: '#fffefb',
        padding: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 6,
          flexWrap: 'wrap',
        }}
      >
        <strong>{storedHeading(b.block)}</strong>
        <span style={{ ...badge, color: '#6f6a60' }}>{b.lens}</span>
        <span style={{ ...badge, color: STATUS_COLOR[b.reviewStatus] }}>{b.reviewStatus}</span>
        <span style={{ ...badge, color: '#6f6a60' }}>
          {b.source} · {Math.round(b.confidence * 100)}%
        </span>
        {b.manualOverride && <span style={{ ...badge, color: '#854f0b' }}>edited</span>}
      </div>

      {text ? (
        <form action={editForm.bind(null, b.id, trailRef)}>
          <textarea
            name="text"
            defaultValue={text}
            rows={Math.min(8, Math.max(2, Math.ceil(text.length / 90)))}
            style={{
              width: '100%',
              fontSize: 13,
              padding: 8,
              borderRadius: 6,
              border: '1px solid rgba(58,51,40,0.13)',
              resize: 'vertical',
            }}
          />
          <button type="submit" style={btn}>
            Save edit
          </button>
        </form>
      ) : (
        <p style={{ fontSize: 13, color: '#6f6a60', fontStyle: 'italic' }}>
          {b.block.unit === 'stageBlock'
            ? `${b.block.block.kind} block (no editable text)`
            : 'no text'}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <form action={statusForm.bind(null, b.id, trailRef, 'published')}>
          <button type="submit" style={{ ...btn, color: '#3d5a3f' }}>
            Publish
          </button>
        </form>
        <form action={statusForm.bind(null, b.id, trailRef, 'flagged')}>
          <button type="submit" style={{ ...btn, color: '#a32d2d' }}>
            Flag
          </button>
        </form>
        <form action={statusForm.bind(null, b.id, trailRef, 'draft')}>
          <button type="submit" style={btn}>
            Reset
          </button>
        </form>
      </div>
    </article>
  );
}

const badge: React.CSSProperties = { fontSize: 11, fontFamily: 'ui-monospace, monospace' };
const btn: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid rgba(58,51,40,0.13)',
  background: '#faf7f1',
  cursor: 'pointer',
};
