# Trail blaze sprites

Pre-rendered painted-waymark signs, drawn along the route by the native map
`SymbolLayer` (`symbol-placement: line`). One sprite per distinct `osmc:symbol`,
named `blaze-<symbolKey>` (the key comes from `symbolKey()` in `@roam/core`).

These are **generated from the same `waymarkSvg()` definition** the RN `Waymark`
component renders, so the map and UI never drift (§17.2).

- `src/blaze-*.svg` — the `waymarkSvg()` output (source of truth).
- `blaze-*.png`, `@2x`, `@3x` — rasters (28 / 56 / 84 px), registered via
  `components/map/blazeIcons.tsx`.

## Regenerate

```js
// scratch — run with bun at the repo root, then rasterize the SVGs with resvg
import { resolveWaymark, waymarkSvg, symbolKey } from './packages/core/src/waymark.ts';
// for each route's osmc:symbol:
const sym = resolveWaymark({ osmcSymbol, network, ref }).symbol;
await Bun.write(`apps/mobile/assets/blazes/src/blaze-${symbolKey(sym)}.svg`, waymarkSvg(sym));
```
```js
// rasterize each src/*.svg with @resvg/resvg-js at widths 28 / 56 / 84
const png = new Resvg(svg, { fitTo: { mode: 'width', value: px } }).render().asPng();
```

When this set changes, bump `MAP_STYLE_VERSION` (offline packs cache the sprites).
