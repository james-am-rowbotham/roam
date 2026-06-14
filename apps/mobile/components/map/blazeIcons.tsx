import { Images } from '@maplibre/maplibre-react-native';

// Pre-rendered blaze sprites — the repeating painted sign drawn along the route
// by the native SymbolLayer (§17.2). One sprite per distinct osmc:symbol, named
// `blaze-<symbolKey>` (symbolKey from @roam/core). Generated from the same
// waymarkSvg() the RN Waymark uses — see assets/blazes/README.md. As more trails
// land, add their generated sprites here (or build this map at ingest).
export const BLAZE_SPRITES = {
  'blaze-white-red-lower-11': require('../../assets/blazes/blaze-white-red-lower-11.png'),
} as const;

// Registers the blaze sprites on the map. Render once inside <MapView>; a
// SymbolLayer can then reference `blaze-<symbolKey>` as its icon-image.
export function BlazeImages() {
  return <Images images={BLAZE_SPRITES} />;
}
