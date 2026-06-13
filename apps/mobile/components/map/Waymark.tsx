import { type OsmcSymbol, waymarkSvg } from '@roam/core';
import { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import { fonts } from '../../theme';

interface Props {
  /** The parsed painted sign from osmc:symbol (§17.8). */
  symbol: OsmcSymbol;
  /** Plate edge length in px. */
  size?: number;
}

// The painted trail waymark, rendered from the single shared drawing definition
// in @roam/core (`waymarkSvg`) — the same SVG that the map sprite generator
// rasterizes, so RN and the map never drift (§17.2). Pure visual; callers place
// it (trail hero, legend, map overlay).
export function Waymark({ symbol, size = 22 }: Props) {
  const xml = useMemo(() => waymarkSvg(symbol, { fontFamily: fonts.monoMedium }), [symbol]);
  return <SvgXml xml={xml} width={size} height={size} />;
}
