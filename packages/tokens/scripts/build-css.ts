// Emit tokens.css (the web's Tailwind @theme block) from the shared token
// values. Run `bun run build` in packages/tokens after changing any colour or
// radius token, then commit the regenerated tokens.css.
import { themeCss } from '../src/css';

const out = new URL('../tokens.css', import.meta.url);
await Bun.write(out, themeCss());
console.log(`Wrote ${out.pathname}`);
