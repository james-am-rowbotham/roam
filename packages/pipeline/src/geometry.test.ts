import { describe, expect, test } from 'bun:test';
import { type LonLat, type Piece, orderIntoLine, toPieces } from './geometry';

describe('toPieces', () => {
  test('drops degenerate pieces (<2 points)', () => {
    const pieces = toPieces([
      [[0, 0]], // single point — no direction
      [
        [0, 0],
        [1, 0],
      ],
    ]);
    expect(pieces).toHaveLength(1);
    expect(pieces[0]?.start).toEqual([0, 0]);
    expect(pieces[0]?.end).toEqual([1, 0]);
  });
});

describe('orderIntoLine', () => {
  test('returns empty for no pieces', () => {
    expect(orderIntoLine([])).toEqual([]);
  });

  test('orders west→east and stitches without duplicating the shared vertex', () => {
    // Two touching segments given east-first; result must start at the west end
    // and run continuously through the join.
    const east: Piece = {
      coords: [
        [1, 0],
        [2, 0],
      ],
      start: [1, 0],
      end: [2, 0],
    };
    const west: Piece = {
      coords: [
        [0, 0],
        [1, 0],
      ],
      start: [0, 0],
      end: [1, 0],
    };
    const line = orderIntoLine([east, west]);
    expect(line).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
  });

  test('flips a piece whose far end is the nearer join', () => {
    // Second piece is given reversed (its end touches the first piece's tail);
    // orderIntoLine must flip it so the chain stays continuous.
    const a: Piece = {
      coords: [
        [0, 0],
        [1, 0],
      ],
      start: [0, 0],
      end: [1, 0],
    };
    const bReversed: Piece = {
      coords: [
        [2, 0],
        [1, 0],
      ],
      start: [2, 0],
      end: [1, 0],
    };
    const line = orderIntoLine([a, bReversed]);
    expect(line).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
  });

  test('chains several out-of-order pieces into one monotonic line', () => {
    const raw: LonLat[][] = [
      [
        [2, 0],
        [3, 0],
      ],
      [
        [0, 0],
        [1, 0],
      ],
      [
        [1, 0],
        [2, 0],
      ],
    ];
    const line = orderIntoLine(toPieces(raw));
    expect(line.map((p) => p[0])).toEqual([0, 1, 2, 3]);
  });
});
