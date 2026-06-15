// Route geometry stitching — pure, no I/O (§19: spatial logic is unit-tested).
//
// OSM route ways come back as several disconnected pieces (small gaps between
// members), and ST_LineMerge/ST_Dump order is NOT walking order, which corrupts
// chainage (§7). These helpers stitch the pieces into one continuous, correctly
// ordered line so distance-from-start is monotonic.

export type LonLat = [number, number];

export interface Piece {
  coords: LonLat[];
  start: LonLat;
  end: LonLat;
}

// Wrap raw coordinate arrays as Pieces (capturing each endpoint). Degenerate
// pieces (<2 points) are dropped — they carry no direction to join on.
export function toPieces(raw: LonLat[][]): Piece[] {
  const out: Piece[] = [];
  for (const coords of raw) {
    const start = coords[0];
    const end = coords[coords.length - 1];
    if (start && end && coords.length >= 2) out.push({ coords, start, end });
  }
  return out;
}

// Greedy nearest-neighbour chain. Seeds at the westernmost endpoint (long trails
// like the GR11 run Atlantic→Mediterranean) and repeatedly appends the nearest
// remaining piece, flipping it when its far end is the closer join. Comparisons
// use squared lon/lat distance — fine for ordering, no need for true geodesics.
export function orderIntoLine(pieces: Piece[]): LonLat[] {
  const d2 = (a: LonLat, b: LonLat) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

  let seed: { piece: Piece; coords: LonLat[] } | null = null;
  let minLon = Number.POSITIVE_INFINITY;
  for (const p of pieces) {
    if (p.start[0] < minLon) {
      minLon = p.start[0];
      seed = { piece: p, coords: p.coords };
    }
    if (p.end[0] < minLon) {
      minLon = p.end[0];
      seed = { piece: p, coords: [...p.coords].reverse() };
    }
  }
  if (!seed) return [];

  const used = new Set<Piece>([seed.piece]);
  const chain: LonLat[] = [...seed.coords];
  let tail = chain[chain.length - 1] ?? null;

  while (used.size < pieces.length && tail) {
    let best: { piece: Piece; coords: LonLat[] } | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const p of pieces) {
      if (used.has(p)) continue;
      const ds = d2(tail, p.start);
      const de = d2(tail, p.end);
      if (ds < bestD) {
        bestD = ds;
        best = { piece: p, coords: p.coords };
      }
      if (de < bestD) {
        bestD = de;
        best = { piece: p, coords: [...p.coords].reverse() };
      }
    }
    if (!best) break;
    used.add(best.piece);
    chain.push(...best.coords.slice(1));
    tail = chain[chain.length - 1] ?? tail;
  }
  return chain;
}
