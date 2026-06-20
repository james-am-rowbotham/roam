# @roam/web

The public **web guide** — Roam's SEO content net and acquisition surface (§7,
§21.7). Next.js (App Router) so pages are server-rendered for search engines and
fast first paint; the app you take up the mountain is `apps/mobile`.

## What's here

- **Home (Explore)** (`app/page.tsx`, Figma `1177:2363`): a live hero map of the
  GR11, popular trails (rendered live from the API — GR11 and GR10), and
  browse-by-range / country / peak grids.
- **Trail guide** (`app/trails/[slug]/page.tsx`, Figma `944:2067`): the per-trail
  page, statically generated for every onboarded trail (`/trails/gr11`,
  `/trails/gr10`). Hero, at-a-glance stat band, a facts card with the painted
  waymark, the live route map + elevation profile, and the trail's coarse
  Regions derived by grouping its stages. All driven by the backend.

## Reuse — one design language, one data source

- **`@roam/core`** — the painted trail blaze on the web is rebuilt with the same
  pure `waymarkSvg` / `resolveWaymark` the app, map and admin use, so the sign
  never drifts across surfaces (§17.8).
- **The Hono API (`apps/api`)** — every trail/route shape comes from the backend.
  `GET /trails` feeds the catalogue, `GET /trails/:id` the route geometry +
  elevation, `GET /trails/:id/sections` the stages. Types are **generated from
  the API's OpenAPI spec** with Orval (`bun run codegen`, same as mobile, §19) —
  never hand-written. `lib/api.ts` wraps the generated fetchers with ISR caching
  and graceful fallback to design defaults so the page always renders.
- **Design tokens** mirror `apps/mobile/theme` as Tailwind v4 `@theme` variables
  in `app/globals.css`; fonts (Bricolage / Hanken / Geist Mono) via `next/font`.

## Map

The hero is a real, interactive **MapLibre GL** map (`components/HeroMap.tsx`),
matching the offline-first map architecture (§7/§17). The base style URL lives in
`lib/map.ts` (`NEXT_PUBLIC_MAP_STYLE_URL`, default OpenFreeMap) so swapping to our
own outdoor style on R2/CDN later is a config change, not a refactor.

## Develop

```bash
bun run dev:web          # from repo root → http://localhost:3001
bun run build:web        # production build
```

Copy `.env.example` → `.env.local` and point `ROAM_API_URL` at a running API
(default `http://localhost:3000`). With no API up, the page renders from
fixtures.

## SEO

Server-rendered HTML, `generateMetadata` + Open Graph / Twitter cards, JSON-LD
(`WebSite` + `ItemList` of `TouristTrip`), `robots.ts` and `sitemap.ts`. Pages
are statically prerendered and revalidated hourly.
