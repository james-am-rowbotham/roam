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
