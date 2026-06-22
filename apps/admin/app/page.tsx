import Link from 'next/link';
import { listObjectives } from '../lib/data';

export const dynamic = 'force-dynamic';

// The curation index — every trail with its content-review counts.
export default async function Home() {
  const objectives = await listObjectives();
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Trails</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--color-text-secondary, #6f6a60)' }}>
            <th style={th}>Trail</th>
            <th style={th}>Blocks</th>
            <th style={th}>Published</th>
            <th style={th}>Flagged</th>
          </tr>
        </thead>
        <tbody>
          {objectives.map((o) => (
            <tr key={o.ref} style={{ borderTop: '1px solid rgba(58,51,40,0.13)' }}>
              <td style={td}>
                <Link href={`/objective/${encodeURIComponent(o.ref)}`}>{o.name}</Link>{' '}
                <span style={{ color: 'var(--color-text-secondary, #6f6a60)' }}>({o.ref})</span>
              </td>
              <td style={td}>{o.total}</td>
              <td style={td}>{o.published}</td>
              <td style={{ ...td, color: o.flagged ? '#a32d2d' : undefined }}>{o.flagged}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {objectives.length === 0 && <p>No trails found. Is DATABASE_URL set + the trail ingested?</p>}
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 500 };
const td: React.CSSProperties = { padding: '8px 12px' };
