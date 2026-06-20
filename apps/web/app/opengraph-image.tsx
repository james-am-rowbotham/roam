import { ImageResponse } from 'next/og';

// Dynamically generated social-share card — a branded asset rendered at build
// from theme colours, so we ship no bundled OG photo. Next wires this up as the
// site's og:image / twitter:image automatically.
export const alt = 'Roam — Every great trail, in your pocket';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '96px',
        background: '#3D5A3F',
        color: '#FAF4E8',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 64, height: 44, gap: 6 }}>
          <div style={{ flex: 1, background: '#FAF4E8', borderRadius: 6 }} />
          <div style={{ flex: 1, background: '#D63A22', borderRadius: 6 }} />
        </div>
        <div style={{ fontSize: 52, fontWeight: 700 }}>roam</div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: 76,
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: -2,
        }}
      >
        <span>Every great trail,</span>
        <span>in your pocket.</span>
      </div>
      <div style={{ fontSize: 30, marginTop: 32, color: 'rgba(250,244,232,0.85)' }}>
        Offline maps · a guide that walks with you · the GR11 across the Pyrenees
      </div>
    </div>,
    size,
  );
}
