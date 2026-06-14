import { describe, expect, it } from 'bun:test';
import { type OsmcSymbol, parseOsmcSymbol, resolveWaymark, symbolKey, waymarkSvg } from './waymark';

describe('parseOsmcSymbol — the painted parts', () => {
  it('parses the GR11 sign (white plate, red lower bar, "11" in black)', () => {
    const s = parseOsmcSymbol('red:white:red_lower:11:black') as OsmcSymbol;
    expect(s.wayColor).toBe('#C74538'); // red line
    expect(s.background).toMatchObject({ colorName: 'white', shape: null });
    expect(s.foregrounds).toHaveLength(1);
    expect(s.foregrounds[0]).toMatchObject({ colorName: 'red', shape: 'lower', color: '#C74538' });
    expect(s.text).toBe('11');
    expect(s.textColor).toBe('#26231E'); // black → ink
  });

  it('parses a background shape (blue plate with a frame)', () => {
    const s = parseOsmcSymbol('red:blue_frame:white_dot') as OsmcSymbol;
    expect(s.background).toMatchObject({ colorName: 'blue', shape: 'frame' });
    expect(s.foregrounds[0]).toMatchObject({ colorName: 'white', shape: 'dot' });
    expect(s.text).toBeNull();
  });

  it('stacks multiple foreground marks', () => {
    const s = parseOsmcSymbol('yellow:white:white_bar:red_stripe') as OsmcSymbol;
    expect(s.foregrounds.map((f) => `${f.colorName}_${f.shape}`)).toEqual([
      'white_bar',
      'red_stripe',
    ]);
  });

  it('keeps text that is not a mark, with no text colour', () => {
    const s = parseOsmcSymbol('red:white:white_bar:GR') as OsmcSymbol;
    expect(s.text).toBe('GR');
    expect(s.textColor).toBeNull();
  });

  it('accepts literal #hex colours from the data', () => {
    const s = parseOsmcSymbol('#ff0000:white') as OsmcSymbol;
    expect(s.wayColor).toBe('#ff0000');
  });

  it('returns null for a tag too short to be a waymark', () => {
    expect(parseOsmcSymbol('red')).toBeNull();
  });
});

describe('resolveWaymark — literal symbol + metadata', () => {
  it('builds the GR11 waymark from osmc:symbol (colour comes from the data)', () => {
    const w = resolveWaymark({
      osmcSymbol: 'red:white:red_lower:11:black',
      network: 'nwn',
      ref: 'GR11',
    });
    expect(w.symbol?.foregrounds[0]?.color).toBe('#C74538');
    expect(w.symbol?.text).toBe('11');
    expect(w.network).toBe('nwn'); // raw OSM tier, mirrored as-is
    expect(w.review).toBeUndefined();
  });

  it('flags a blue (non-hiking) blaze for review, still parsing it', () => {
    const w = resolveWaymark({ osmcSymbol: 'blue:white:blue_bar', ref: 'Bike 7' });
    expect(w.symbol?.wayColor).toBe('#2E6EB0');
    expect(w.review).toBe('non-hiking-blue');
  });

  it('flags routes with neither a symbol nor a network for review', () => {
    expect(resolveWaymark({ ref: 'Path 3' }).review).toBe('unresolved');
  });

  it('mirrors network as-is when osmc:symbol is absent (no symbol to build)', () => {
    const w = resolveWaymark({ network: 'lwn', ref: 'SL-A 1' });
    expect(w.symbol).toBeNull();
    expect(w.network).toBe('lwn');
    expect(w.review).toBeUndefined();
  });
});

describe('symbolKey — sprite naming', () => {
  it('names GR11 by its structure', () => {
    const s = parseOsmcSymbol('red:white:red_lower:11:black') as OsmcSymbol;
    expect(symbolKey(s)).toBe('white-red-lower-11');
  });

  it('is stable for identical signs and sanitised', () => {
    const a = parseOsmcSymbol('yellow:white:yellow_bar:PR 30') as OsmcSymbol;
    const b = parseOsmcSymbol('yellow:white:yellow_bar:PR 30') as OsmcSymbol;
    expect(symbolKey(a)).toBe(symbolKey(b));
    expect(symbolKey(a)).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('waymarkSvg — the shared drawing', () => {
  it('paints the GR11 sign (white plate, red lower bar, "11")', () => {
    const symbol = parseOsmcSymbol('red:white:red_lower:11:black') as OsmcSymbol;
    const svg = waymarkSvg(symbol);
    expect(svg).toContain('viewBox="0 0 100 100"');
    expect(svg).toContain('fill="#FDFCFC"'); // white plate
    expect(svg).toContain('<rect y="50" width="100" height="50" fill="#C74538"'); // red lower bar
    expect(svg).toContain('>11</text>');
    expect(svg).toContain('fill="#26231E"'); // black → ink text
  });

  it('escapes text and passes through the font family', () => {
    const symbol = parseOsmcSymbol('red:white:white_bar:A&B') as OsmcSymbol;
    const svg = waymarkSvg(symbol, { fontFamily: 'GeistMono' });
    expect(svg).toContain('font-family="GeistMono"');
    expect(svg).toContain('A&amp;B');
  });
});
