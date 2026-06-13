# Map marker glyphs

White-on-transparent PNG glyphs drawn on top of the POI marker discs by the
native map `SymbolLayer`s (see `components/map/markerIcons.tsx`). MapLibre needs
raster images for `icon-image`, so these are rasterized from the vector sources.

- `src/glyph-*.svg` — editable vector sources (white stroke, 24×24, transparent).
  These are the Figma icon masters (`icon/water-bottle`, `icon/stay`, `icon/food`,
  `icon/mountain`) recoloured white with the master background removed.
- `glyph-*.png`, `glyph-*@2x.png`, `glyph-*@3x.png` — generated rasters (24 / 48 /
  72 px). RN resolves the right density per device automatically.

## Regenerate the PNGs

After editing any `src/*.svg`:

```sh
npx @resvg/resvg-js  # (used via the snippet below; no repo dependency)
```

```js
// scratch script — run with node
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
for (const g of ['water', 'stay', 'food', 'mountain']) {
  const svg = fs.readFileSync(`src/glyph-${g}.svg`);
  for (const [suffix, px] of [['', 24], ['@2x', 48], ['@3x', 72]]) {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: px } }).render().asPng();
    fs.writeFileSync(`glyph-${g}${suffix}.png`, png);
  }
}
```
