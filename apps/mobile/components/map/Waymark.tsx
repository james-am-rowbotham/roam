import type { OsmcSymbol } from '@roam/core';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fonts } from '../../theme';

interface Props {
  /** The parsed painted sign from osmc:symbol (§17.8). */
  symbol: OsmcSymbol;
  /** Plate edge length in px. */
  size?: number;
}

// Build the style for a foreground mark of a given shape, painted in its own
// colour over the plate. Covers the rectangular GR/PR/SL vocabulary (lower, bar,
// stripe…) with Views; unknown shapes fall back to a centred bar. The plate clips
// to its rounded corners, so marks can run edge-to-edge.
function markStyle(shape: string | null, color: string, size: number): ViewStyle {
  const fill: ViewStyle = { position: 'absolute', backgroundColor: color };
  const band = Math.round(size * 0.34);
  const center = Math.round((size - band) / 2);
  switch (shape) {
    // Half-fills anchor BOTH edges (top/bottom) so they reach the plate edge
    // exactly — a fixed height can leave a sub-pixel sliver of plate showing.
    case 'lower':
      return { ...fill, left: 0, right: 0, top: size / 2, bottom: 0 };
    case 'upper':
      return { ...fill, left: 0, right: 0, top: 0, bottom: size / 2 };
    case 'left':
      return { ...fill, top: 0, bottom: 0, left: 0, right: size / 2 };
    case 'right':
      return { ...fill, top: 0, bottom: 0, right: 0, left: size / 2 };
    case 'bar':
      return { ...fill, left: 0, right: 0, top: center, height: band };
    case 'stripe':
      return { ...fill, top: 0, bottom: 0, left: center, width: band };
    case 'dot': {
      const d = Math.round(size * 0.42);
      const o = Math.round((size - d) / 2);
      return { ...fill, width: d, height: d, borderRadius: d / 2, top: o, left: o };
    }
    case 'circle':
    case 'ring': {
      const inset = Math.round(size * 0.16);
      return {
        position: 'absolute',
        top: inset,
        left: inset,
        right: inset,
        bottom: inset,
        borderRadius: size,
        borderWidth: Math.max(1.5, size * 0.11),
        borderColor: color,
      };
    }
    case 'frame':
      return {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: Math.max(1.5, size * 0.12),
        borderColor: color,
      };
    default:
      // Unknown shape → a centred bar (legible stand-in until it's modelled).
      return { ...fill, left: 0, right: 0, top: center, height: band };
  }
}

// The painted trail waymark, reconstructed from a parsed osmc:symbol — a coloured
// background plate, the foreground marks over it, and the text, all in the literal
// colours from the data (§16/§17.8). GR11 → white plate, red lower bar, "11".
// Pure visual; callers place it (map Marker, legend, trail detail).
export function Waymark({ symbol, size = 22 }: Props) {
  const round = symbol.background.shape === 'circle' || symbol.background.shape === 'round';
  return (
    <View
      style={[
        styles.plate,
        {
          width: size,
          height: size,
          backgroundColor: symbol.background.color,
          // Painted blazes are hard-edged — square unless the symbol is a circle.
          borderRadius: round ? size / 2 : 0,
        },
      ]}
    >
      {symbol.foregrounds.map((f, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: marks are positional and stable
          key={i}
          style={markStyle(f.shape, f.color, size)}
        />
      ))}
      {symbol.text ? (
        <View style={styles.textWrap} pointerEvents="none">
          <Text
            numberOfLines={1}
            style={[
              styles.text,
              {
                color: symbol.textColor ?? colors.text.primary,
                fontSize: Math.round(size * 0.44),
              },
            ]}
          >
            {symbol.text}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.brand.blazeHairline,
  },
  textWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.monoMedium,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
});
