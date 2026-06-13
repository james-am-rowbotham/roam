import { describe, expect, it } from 'bun:test';
import { type OsmcSymbol, parseOsmcSymbol, resolveWaymark } from './waymark';

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
    expect(w.networkClass).toBe('gr'); // metadata only, not the colour source
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

  it('keeps networkClass when osmc:symbol is absent (no symbol to build)', () => {
    const w = resolveWaymark({ network: 'lwn', ref: 'SL-A 1' });
    expect(w.symbol).toBeNull();
    expect(w.networkClass).toBe('sl');
    expect(w.review).toBeUndefined();
  });
});
