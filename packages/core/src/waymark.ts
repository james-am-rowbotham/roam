// osmc:symbol parsing & waymark resolution (§16, §17.8 — literal-symbol model).
//
// The blaze is BUILT from the real painted waymark encoded in OSM `osmc:symbol`,
// not bucketed into a fixed gr/pr/sl palette. We parse the tag into its parts —
// the background plate, the foreground marks, the text and their colours — so the
// renderer can reconstruct the actual sign (e.g. GR11 = a white plate with a red
// lower bar and "11" in black). Pure and shared by pipeline, map, legend and
// admin — one definition.
//
// osmc:symbol grammar (OSM):
//   waycolour : background [ : foreground [ : foreground2 ] ] [ : text [ : textcolour ] ]
//   e.g. "red:white:red_lower:11:black"

// osmc:symbol colour vocabulary → the hex we paint each named colour. The DATA
// chooses the colour name; this only fixes how each name renders (tuned to the
// app palette). The full colour set — not a three-class snap.
export const OSMC_COLORS: Record<string, string> = {
  black: '#26231E',
  blue: '#2E6EB0',
  brown: '#7C6E5C',
  gray: '#808080',
  grey: '#808080',
  green: '#5C8C3D',
  orange: '#D98A3A',
  purple: '#7D57C2',
  red: '#C74538',
  white: '#FDFCFC',
  yellow: '#D9B53A',
};

// Resolve an osmc colour token (a named colour or a literal #hex) to a hex.
function colorHex(token: string): string | null {
  const t = token.trim().toLowerCase();
  if (OSMC_COLORS[t]) return OSMC_COLORS[t];
  if (/^#[0-9a-f]{3,8}$/.test(t)) return t;
  return null;
}

function isColor(token: string): boolean {
  return colorHex(token) !== null;
}

// A coloured element of the waymark — the background plate or a foreground mark.
export interface OsmcMark {
  /** Rendered hex. */
  color: string;
  /** Raw osmc colour name (or #hex), kept for legend/admin. */
  colorName: string;
  /** Shape suffix, e.g. 'bar' | 'lower' | 'dot' | 'frame'; null = solid fill. */
  shape: string | null;
}

// The fully parsed painted waymark — enough to reconstruct the sign.
export interface OsmcSymbol {
  /** Hex of the route-line colour (osmc field 0). The map draws the line in this. */
  wayColor: string | null;
  /** The plate. */
  background: OsmcMark;
  /** Marks painted over the plate, in order. */
  foregrounds: OsmcMark[];
  /** Text on the waymark, e.g. "11". */
  text: string | null;
  /** Hex of the text colour. */
  textColor: string | null;
}

// A field is a foreground mark when it's `colour_shape` (e.g. "red_lower"). A
// bare colour ("black") or bare word ("11") is text/textcolour, not a mark.
function isForegroundField(field: string): boolean {
  if (!field.includes('_')) return false;
  const head = field.split('_')[0] ?? '';
  return isColor(head);
}

// Unknown colour names fall back to a neutral plate rather than dropping the mark.
const FALLBACK_COLOR = '#FDFCFC';

function parseMark(field: string): OsmcMark {
  const parts = field.split('_');
  const colorName = parts[0] ?? '';
  return {
    color: colorHex(colorName) ?? FALLBACK_COLOR,
    colorName,
    shape: parts.length > 1 ? parts.slice(1).join('_') : null,
  };
}

// Parse a raw osmc:symbol into its painted parts. Returns null when the tag is
// too short to be a waymark (need at least waycolour:background).
export function parseOsmcSymbol(raw: string): OsmcSymbol | null {
  const fields = raw.split(':').map((f) => f.trim());
  if (fields.length < 2) return null;

  const wayColor = colorHex(fields[0] ?? '');
  const background = parseMark(fields[1] ?? '');

  // Consume leading foreground marks; the tail is [text] or [text, textcolour].
  const rest = fields.slice(2);
  const foregrounds: OsmcMark[] = [];
  let i = 0;
  while (i < rest.length && isForegroundField(rest[i] ?? '')) {
    foregrounds.push(parseMark(rest[i] ?? ''));
    i++;
  }

  const tail = rest.slice(i).filter((f) => f.length > 0);
  let text: string | null = null;
  let textColor: string | null = null;
  if (tail.length === 1) {
    // A lone trailing colour is a text colour with no text; otherwise it's text.
    if (isColor(tail[0] ?? '')) textColor = colorHex(tail[0] ?? '');
    else text = tail[0] ?? null;
  } else if (tail.length >= 2) {
    text = tail[0] ?? null;
    const last = tail[tail.length - 1] ?? '';
    if (isColor(last)) textColor = colorHex(last);
  }

  return { wayColor, background, foregrounds, text, textColor };
}

// A stable, human-readable key for a distinct painted sign — names the map sprite
// (one sprite per unique symbol, §17.2). Same structure → same key, so identical
// signs share a sprite. GR11 → "white-red-lower-11".
export function symbolKey(symbol: OsmcSymbol): string {
  const bg =
    symbol.background.colorName + (symbol.background.shape ? `-${symbol.background.shape}` : '');
  const fgs = symbol.foregrounds.map((f) => `${f.colorName}-${f.shape ?? 'fill'}`);
  const raw = [bg, ...fgs, symbol.text ?? ''].filter(Boolean).join('-').toLowerCase();
  return raw.replace(/[^a-z0-9-]/g, '');
}

// network tier → class. This is sort/filter/zoom-priority metadata (§16) — it is
// NOT the blaze colour, which comes from the parsed symbol above.
export type NetworkClass = 'gr' | 'pr' | 'sl';
const NETWORK_CLASS: Record<string, NetworkClass> = {
  iwn: 'gr',
  nwn: 'gr',
  rwn: 'pr',
  lwn: 'sl',
};

export interface WaymarkInput {
  osmcSymbol?: string | null;
  network?: string | null;
  ref?: string | null;
  name?: string | null;
}

// The resolved waymark stored per route (§9). `symbol` is the painted blaze the
// renderer builds from; `networkClass` is separate metadata; `review` flags a
// route a curator must look at (a blue/non-hiking blaze, or no signal at all).
export interface Waymark {
  symbol: OsmcSymbol | null;
  ref: string | null;
  network: string | null;
  networkClass: NetworkClass | null;
  review?: 'non-hiking-blue' | 'unresolved';
}

// Blue waymark = bike/horse (or Swiss alpine difficulty), not a hiking trail (§16).
function isBlueTrail(symbol: OsmcSymbol | null): boolean {
  return symbol?.wayColor === OSMC_COLORS.blue || symbol?.background.color === OSMC_COLORS.blue;
}

export function resolveWaymark(input: WaymarkInput): Waymark {
  const ref = input.ref?.trim() || null;
  const network = input.network?.trim()?.toLowerCase() || null;
  const networkClass = (network && NETWORK_CLASS[network]) || null;
  const symbol = input.osmcSymbol ? parseOsmcSymbol(input.osmcSymbol) : null;

  const waymark: Waymark = { symbol, ref, network, networkClass };
  if (isBlueTrail(symbol)) waymark.review = 'non-hiking-blue';
  else if (!symbol && !networkClass) waymark.review = 'unresolved';
  return waymark;
}

// ---------------------------------------------------------------------------
// Drawing — the single shared definition of how a parsed symbol is painted.
// Produces an SVG string in a 100×100 viewBox, so it renders identically in RN
// (react-native-svg) and as a rasterized map sprite (resvg, build/ingest). One
// definition, every surface — §17.2.
// ---------------------------------------------------------------------------

const INK = '#26231E'; // default text colour when osmc:symbol omits one
const HAIRLINE = 'rgba(0,0,0,0.10)'; // subtle plate edge for contrast on the map

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === '"' ? '&quot;' : '&#39;',
  );
}

// A foreground mark in the 100-unit plate. Half-fills span edge-to-edge so they
// reach the plate exactly; rings/frames are stroked. Unknown → a centred bar.
function markSvg(shape: string | null, color: string): string {
  switch (shape) {
    case 'lower':
      return `<rect y="50" width="100" height="50" fill="${color}"/>`;
    case 'upper':
      return `<rect width="100" height="50" fill="${color}"/>`;
    case 'left':
      return `<rect width="50" height="100" fill="${color}"/>`;
    case 'right':
      return `<rect x="50" width="50" height="100" fill="${color}"/>`;
    case 'bar':
      return `<rect y="33" width="100" height="34" fill="${color}"/>`;
    case 'stripe':
      return `<rect x="33" width="34" height="100" fill="${color}"/>`;
    case 'dot':
      return `<circle cx="50" cy="50" r="21" fill="${color}"/>`;
    case 'circle':
    case 'ring':
      return `<circle cx="50" cy="50" r="34" fill="none" stroke="${color}" stroke-width="11"/>`;
    case 'frame':
      return `<rect x="6" y="6" width="88" height="88" fill="none" stroke="${color}" stroke-width="12"/>`;
    default:
      return `<rect y="33" width="100" height="34" fill="${color}"/>`;
  }
}

// Render a parsed waymark to an SVG string. `fontFamily` lets each surface pass
// its own font (RN passes the loaded Geist Mono; resvg passes a font file name).
export function waymarkSvg(symbol: OsmcSymbol, opts?: { fontFamily?: string }): string {
  const font = opts?.fontFamily ?? 'monospace';
  const round = symbol.background.shape === 'circle' || symbol.background.shape === 'round';
  const plateShape = round
    ? '<circle cx="50" cy="50" r="50"/>'
    : '<rect width="100" height="100"/>';
  const marks = symbol.foregrounds.map((f) => markSvg(f.shape, f.color)).join('');
  const text = symbol.text
    ? `<text x="50" y="50" font-family="${font}" font-size="44" font-weight="600" fill="${
        symbol.textColor ?? INK
      }" text-anchor="middle" dominant-baseline="central">${escapeXml(symbol.text)}</text>`
    : '';
  const border = round
    ? `<circle cx="50" cy="50" r="49" fill="none" stroke="${HAIRLINE}" stroke-width="2"/>`
    : `<rect x="1" y="1" width="98" height="98" fill="none" stroke="${HAIRLINE}" stroke-width="2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><clipPath id="wm">${plateShape}</clipPath></defs><g clip-path="url(#wm)"><g fill="${symbol.background.color}">${plateShape}</g>${marks}</g>${border}${text}</svg>`;
}
