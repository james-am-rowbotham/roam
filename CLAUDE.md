# Roam — Project Guide

> Long-distance trail companion app. Plan a journey on a long trail (e.g. GR11),
> navigate it stage-by-stage with offline maps, and get help from an on-trail
> "Guide". This file is the canonical context for AI coding agents and humans.

Links for figma designs and architectural designs:

https://www.figma.com/design/qooJ77tbwQb1dB7P3Htetf/Roam-Design?node-id=26-4&p=f&t=qmfn4isZO8yNlg2e-0

https://www.figma.com/board/7GOqbDRos3AI0LN2DPVMru/Roam-architecture?node-id=0-1&p=f&t=0sqrKWK9ncKFVXSB-0

---

## 1. Product in one paragraph

Roam turns a long-distance route into a personal, offline-capable journey. Two objective types share one engine: **multi-day trails** (e.g. the GR11) and **peaks** (e.g. Aneto, with several routes up). A user picks a route — a trail, a trail segment, or one of a peak’s lines — and sets direction, pace (or start/finish dates) and an accommodation style; Roam generates a day-by-day **stage** plan (combining stages when the pace is fast) and suggests overnight stops. On trail, a full-screen map shows the route, the user's position
and nearby water/refuges, and a **Guide** answers questions ("where's the next
water?", "will I make the refuge before dark?"). Progress can be overridden at any
time: mark a stage complete, stop early and resume tomorrow, or add a rest day.

---

## 2. Architecture principles

1. **Offline first** — core features (map, navigation, stage plan, Guide Core)
   work with zero connectivity. Connectivity is an enhancement, never a dependency.
2. **Trail knowledge first** — the curated trail dataset (geometry, sections,
   water, refuges, hazards, transport) is the product's primary asset and the
   knowledge base for the Guide.
3. **Cloud enhanced** — cloud services (frontier Guide, replanning, live weather)
   improve the experience but degrade gracefully.
4. **Progressive complexity** — no routing graphs or custom-route generation until
   a product need exists. A trail is an ordered polyline with linearly-referenced
   points (see §7).

---

## 3. Technology stack

### Client (mobile)
- **Expo** (React Native) + **TypeScript** (strict).
- **MapLibre** (`@maplibre/maplibre-react-native`) rendering **self-hosted vector
  tiles** (PMTiles on R2). See §7 and the map notes below.
- **Zustand** — ephemeral/UI + session state.
- **TanStack Query** — server cache + request lifecycle.
- **MMKV** — fast key-value: auth tokens, flags, small prefs, mutation outbox.
- **SQLite** (`op-sqlite`, or `expo-sqlite`) — the downloaded trail package
  (sections, POIs, water, hazards) and user journey/stage records. MMKV is
  key-value only and cannot hold relational trail data; this is the split:
  MMKV = small/hot state, SQLite = trail package + journeys.

The map SDK is a native module, so the app cannot run in Expo Go — use a **custom
Expo dev client** / EAS Build from day one. MapLibre needs no provider access
token; tile/style URLs point at our own R2/CDN.

**Map rendering — MapLibre.** Offline-first is the whole product (download an
~800 km corridor, use it for weeks off-grid), which is the worst case for Mapbox's
per-MAU/offline metering and tile-pack caps. MapLibre + our own tiles has no
per-user ceiling and matches the rest of the stack (OSM → Martin → MVT → PMTiles on
R2). Rendering quality is equivalent — MapLibre uses the same vector-tile style
spec. Three things this requires:

- **Terrain + base-style is a real workstream (phase 5, do not underestimate).**
  MapLibre does not ship polished terrain/hillshade or a finished outdoor base
  style. Plan for: (1) a **terrain-RGB DEM** source + `hillshade`/`terrain` layers;
  (2) authoring an **outdoor base style** from an open starting point (Protomaps
  basemap, OpenFreeMap, Versatiles, or a MapTiler open style) with the `trail/*`
  and `marker/*` tokens baked in; (3) self-hosting **glyphs + sprites**.
- **Strict `MapView` wrapper.** No renderer-specific types leak into screens;
  tile/source/style URLs live in config. This keeps a future swap (to Mapbox or
  MapTiler) a config-and-style task, not a refactor.
- **Middle option if early velocity matters:** MapTiler is MapLibre-based but sells
  polished styles + terrain + hosted tiles, with self-host and offline
  (MBTiles/PMTiles) paths.

### Backend (API)
- **Bun** runtime, **Hono** framework, deployed on **Fly.io**.
- **Drizzle ORM** over PostgreSQL. Use the `geometry` column type for storage, but
  keep heavy GIS (imports, simplification, tiling, nearest-neighbour) in **raw SQL
  / PostGIS functions**, not the ORM.

### Database
- **PostgreSQL + PostGIS**, hosted on **Supabase** (also provides **Auth** and
  object storage).
- **Auth:** Supabase Auth. User-owned data (journeys, stages, overrides) syncs
  after offline edits via a **mutation outbox** (persisted in MMKV/SQLite, replayed
  through TanStack Query when back online). Server is source of truth once synced;
  last-write-wins is acceptable for V1. The outbox also carries **trail reports** — POI confirmations and condition updates captured offline ("help other hikers") queue locally and replay once back online. These are small JSON mutations, so the queue stays lightweight.

### Infrastructure
- **Fly.io** — Hono API + background jobs (OSM import, weather refresh via Open-Meteo).
- **Cloudflare** — CDN / DNS / (optionally Workers).
- **Cloudflare R2** — offline package bundles, exported vector tiles (PMTiles), static trail assets, and **user photos** (POI evidence; §9, §15).
- **Image handling** — on upload: resize + thumbnail; **light, report-driven moderation** (no heavy pipeline).
- **Notifications** — push via **Expo Notifications** (APNs / FCM) for weather warnings and journey reminders. Forecasts come from **Open-Meteo**, refreshed by the Fly weather job above.

---

## 4. Repository layout

**Bun workspaces** (optionally Turborepo). The Journey Engine and shared types are
importable by both client and server so planning is identical online and offline.

```
roam/
  apps/
    mobile/         # Expo app (UI, map, offline store, Guide client)
    api/            # Hono + Bun service (REST/GeoJSON, Guide Cloud proxy)
    admin/          # internal curation tool — review/verify content and reports
  packages/
    core/           # pure domain: types, Journey Engine, Guide tools (no I/O)
    db/             # Drizzle schema + migrations + seed
    pipeline/       # content ingestion (§8): OSM extract → normalise → model-enrich
    config/         # shared tsconfig, eslint, prettier; per-trail ingestion configs
```

`packages/core` is pure and dependency-light (no React, no fetch). It is
unit-tested in isolation and runs on device for offline planning.

---

## 5. Core domain model

Primary chain: **Route → Journey → Stage**

- **Route** — a curated walkable line (geometry + chainage + metadata): the generalised core entity. A long-distance **Trail** is one long Route (many sections); a **Peak** ascent is a short Route to a summit. Carries an optional **grade** and **gear** for alpine/glaciated lines.
- **Trail** — a long-distance Route, segmented into sections.
- **Peak** — a summit objective (elevation, massif, location) that **groups several Routes** (the lines up). Everything downstream reuses Route machinery unchanged.
- **Journey** — a user’s plan/attempt of a Route (preferences, dates, status).
- **Stage** — a generated day of a journey (start/end, distance, ascent, suggested overnight stop, completion state). A peak is typically a 1–2 stage out-and-back.

Supporting entities: **POI, Accommodation, WaterSource, Hazard, TransportPoint, Section**. A `Section` is the canonical curated segmentation of a Route; `Stage` is the per-journey plan derived from sections + pace.

---

## 6. Trail Knowledge & curation

Every trail bundles: geometry, sections, accommodation, water, food, transport,
hazards, weather (cached), and Guide summaries (short curated text per
trail/section used to ground the Guide). This is the single knowledge source for
the Guide and the contents of the offline package (§10).

**The asset is the *curation system*, not hand-made facts.** Hand-checking every
water source and refuge does not scale, so curation is a pipeline, not a person:

1. **Confidence over verification.** Every fact carries provenance (where it came
   from), freshness (when last confirmed) and an agreement score (how many
   independent signals concur) → a derived confidence. Human attention goes only
   where confidence is *low* and the consequence is *high* (e.g. an unconfirmed
   water source on a long dry stretch).
2. **Hikers are the curators (the scaling mechanism).** The user at the spring is
   the best sensor. One-tap reports ("flowing / trickle / dry", "refuge full") plus
   passive signals (GPS traces confirming the line, completion data)
   turn thousands of walkers into a live update network. Reliability becomes a
   rolling statistic ("flowing in 9 of 11 reports this month"), not a maintained
   fact.
3. **The model does the first pass.** An extraction/LLM pipeline drafts the curated
   layer (from OSM tags, refuge sites, park bulletins, trip reports) and writes the
   Guide summaries. Humans and the crowd *review and correct* — verifying is far
   cheaper than authoring.
4. **Tier by demand.** Flagship trails get rich curation + an active community; the
   long tail launches "OSM-grade, community-improving", clearly labelled by
   confidence so trust degrades honestly.

The flywheel — more hikers → more reports → better data → more hikers — is the
moat. Hand-curation is only the cold-start (GR11) until it spins up.

**Caveats that shape the build:** (a) the flywheel needs density, so **launch
narrow** (a few popular trails) rather than thin across many; (b) crowd data needs
anti-abuse weighting (recency, reporter reliability, agreement) — that **confidence
model is core engineering**, present from the start, not a Phase 2 nicety.

---

## 7. GIS architecture

- **V1:** OSM → import pipeline → PostGIS → **GeoJSON API** → MapLibre.
- **V2:** PostGIS → **Martin** → **vector tiles (PMTiles on R2)** → MapLibre.

**Linear referencing (the core simplification).** Compute a **distance-from-start
(chainage)** value for the trail line and project every point feature (water,
refuge, hazard, transport, section boundary) onto it (`ST_LineLocatePoint` /
`ST_LineSubstring`); store that 1-D position. On-device questions ("next water",
"remaining ascent", "distance to next refuge") become **ordered 1-D lookups with no
spatial index needed offline** — which is why V1 avoids SQLite spatial extensions
and routing graphs entirely. Raw geometry is kept only for drawing.

Serve route geometry **simplified** (`ST_Simplify` / zoom-appropriate) from the
GeoJSON API; ship full-resolution geometry only inside the offline package.

---

## 8. Content ingestion pipeline (`packages/pipeline` + `apps/admin`)

Content acquisition — not engineering — is the real bottleneck for a content-heavy
product. Treat ingestion as a **repeatable, config-driven pipeline**, not a per-trail
script. Adding the 251st trail must cost almost nothing: it's a new **config row**,
not new code.

**Per-trail config** drives every run: `{ trail_id, osm_relation_id, country,
source_urls[], variant_rules }` (GR11 = OSM relation `68861`). The same five stages
run for any trail from its config:

1. **Extract (automated)** — pull the OSM route relation + members and nearby POIs
   (refuges `tourism=alpine_hut/wilderness_hut`, water `natural=spring` /
   `amenity=drinking_water`, campsites, peaks, `mountain_pass`, transport) via
   `osmium`/Overpass into a **staging schema**, untouched.
2. **Normalise (automated)** — transform staging → canonical tables; stitch members
   into one ordered LineString, pick the canonical line per `variant_rules`, then run
   **chainage** (§7). Stamp `source: osm`, `confidence: low`. This is the *draft
   trail* — complete-looking in an afternoon.
3. **Enrich (model-assisted)** — an LLM extraction pass over curated `source_urls`
   (official federation guides e.g. FEDME, refuge sites, park bulletins, public trip
   reports) drafts the fields OSM lacks — refuge capacity/booking/season, water
   seasonality — and writes the per-section Guide summaries. `source: model`,
   unverified. Humans review, never author.
4. **Verify (human, via `apps/admin`)** — curators correct drafts, fix OSM gaps, and
   mark trusted facts `manual_override`. Only done in full for flagship trails.
5. **Seed the living layer** — pre-fill a few condition reports from public trip reports +
   first-hand hikes (clearly attributed) so the living layer isn’t empty at launch;
   the crowd flywheel (§6) then maintains it.

**Peaks run the same pipeline.** A summit (`natural=peak`) becomes an objective; each ascent **route** (OSM route relations / well-known paths, or curated) is normalised + chainaged like a short trail and grouped under the peak. Grade and gear are model-drafted, human-verified.

**Properties that make this scale to ~250 trails:**
- **Idempotent + override-safe.** Stages 1–3 re-run automatically as OSM/sources
  improve; stage 4–5 human/crowd work (`manual_override`, confirmed values) is never
  clobbered. This is the single most important property.
- **Confidence is the universal currency** (§6, §9). Lets automated + model + human +
  crowd content coexist, and lets a trail **ship before it's hand-finished** —
  launched honestly as "OSM-grade, improving," upgraded in place.
- **Human effort scales sub-linearly by triage.** The model drafts all trails;
  curators touch only **low-confidence + high-consequence** items the system surfaces,
  and deep-finish only trails with real usage. Effort tracks demand, not trail count.
- **`apps/admin` is a first-class surface, not a script.** Reviewing drafts, resolving
  conflicting reports, fixing geometry is constant, forever work —
  it needs a real internal tool (authenticated CRUD over Postgres to start).

**Strategy: depth-first.** Hand-finish **GR11** fully through the pipeline first —
that forges the pipeline and admin tool. Then trails 2–20 are pipeline + light finish
on the popular ones; 20–250 are mostly automated, human attention only where
confidence is low and usage is high. Earn breadth by nailing depth once;
thin-everywhere erodes the trust that is the moat.

---

## 9. Database tables

`routes`, `trails`, `peaks`, `sections`, `accommodations`, `water_sources`,
`transport_points`, `hazards`, `journeys`, `stages`. Each spatial/point table carries:
- `geom geometry(...)` for drawing/import, **and**
- `chainage_m double precision` (distance along the parent trail, §7), plus the
  parent `route_id` and ordering.

`routes` is the spine: a `trails` row **or** a `peaks` row links to one or more `routes` (`route.trail_id` xor `route.peak_id`), and a route carries optional `grade` + `gear`. `sections` segment a route.

`journeys`/`stages` carry user ownership, status (`planned|active|completed`), and
override fields (completed, completed_at, rest_day, stopped_early_at_chainage).

**Trust fields on every knowledge fact** (water/accommodation/hazard/…):
`source` (`osm|model|partner|community`), `confidence` (0–1, derived),
`last_confirmed_at`, `report_count`, and `manual_override` (protects a curated
value from re-import).

`reports` — crowd signals: `id`, `entity_type`, `entity_id`, `user_id`, `state`
(e.g. `flowing|trickle|dry`, `open|full`), `note`, `location`, `created_at`. A
fact's `confidence` + `last_confirmed_at` are recomputed from recent, weighted
reports (recency · reporter reliability · agreement). Reports are lightweight text/state signals; user photos live in their own table.

`photos` — **POI evidence**: `id`, `user_id`, `poi_id` (the place it documents), optional `report_id`, `r2_key`, `width`, `height`, `taken_at`, `moderation` (`pending|approved|removed`, report-driven). Added when confirming a spot ("help other hikers") — on POI Detail or the Stage Complete batch — and surfaced on POI Detail’s *Latest photos*. There is no personal journal/reflection layer.

---

## 10. Offline packages

A trail package (downloaded, stored in SQLite + cached tiles) contains: geometry,
sections, accommodation, water, food, transport, hazards, weather cache
(timestamped, with expiry), Guide summaries. **Optional:** the Guide Mini model.

- Bundle format: a versioned manifest + data files in **R2**; client downloads,
  verifies, writes to SQLite, and registers the MapLibre offline tile region (or
  bundles a PMTiles archive for the corridor).
- Show download size and last-updated; re-download when a newer version exists.
  Weather is the only part expected to go stale offline — label it.

---

## 11. Journey Engine (`packages/core`)

Pure, deterministic, no I/O. The same code runs on the server (initial plan) and on
device (offline replanning).

- **Inputs:** trail (sections + chainage), direction, **start/finish stage** (segment), pace **or start + finish dates** (which imply pace), accommodation preference.
- **Outputs:** ordered stages (with combined-stage days at faster pace) and
  suggested overnight stops per night.
- **Responsibilities:** journey creation, stage generation, progress tracking,
  completion/override resolution (mark complete, stop early & resume tomorrow, add
  rest day).
- Deterministic given the same inputs; heavily unit-tested.

---

## 12. Guide architecture

Three layers behind **one interface** — callers never branch on connectivity.

- **Guide Core** — always available, fully deterministic, no model. Answers from
  the trail package via tools (§13): next water, next refuge, remaining elevation,
  current stage, etc. Ships first and covers most real questions.
- **Guide Cloud** — frontier model (Anthropic), online only. Adds advanced
  reasoning, replanning, live-data interpretation. Ships second.
- **Guide Mini** — optional on-device model (downloaded with the package). Adds
  natural-language understanding, tool selection and phrasing, fully on device.
  Ships last as a de-risking spike — on-device LLMs in RN are device-dependent
  (candidates: `llama.rn`/MLC, Apple Foundation Models, Gemini Nano via Android
  AICore). V1 does not depend on it.

The Anthropic API key lives **only** on the Hono backend; the client calls a
`/guide` endpoint that proxies the model with the same tool schema. No model keys
in the app.

---

## 13. Guide tools

Single tool surface shared by all layers; executed locally (against the package)
offline, server-side online. Implemented as pure functions in `packages/core` over
the chainage data so the exact same tool runs on device and on the server.

`getCurrentStage()`, `getRemainingDistance()`, `getRemainingElevation()`,
`getNextWater()`, `getNextAccommodation()`, `getUpcomingHazards()`,
`getCurrentWeather()`, `getSunsetTime()`.

**Entity references (clickable Guide answers).** Tools return entities with their stable `id` and `type` (`poi` / `water_source` / `accommodation` / `hazard` / `section` / `stage`), not just prose, so Guide answers reference them inline and the client renders them as **tappable links** into the entity’s detail screen — e.g. a `getNextWater()` answer naming *Fuente de Góriz* links straight to POI Detail. Wire format: the Guide emits `[label](roam://water_source/<id>)`-style links (or an equivalent `{ text, entities: [{ span, type, id }] }` payload) so links resolve from **stable ids, never by string-matching the name**; the client maps each `type` to its screen and resolves the link against the **local package, offline**. Core templates the references directly; Cloud/Mini are instructed to cite only ids returned by tools — no invented links.

---

## 14. Search

- **V1:** PostgreSQL full-text search (trails, POIs, accommodation, peaks).
- **Future:** dedicated search service only if FTS proves insufficient.

---

## 15. Security & secrets

- Provider/model keys, Supabase service role → **server only** (Fly.io secrets).
- Client holds: Supabase anon key only. Map tiles/styles are our own (R2/CDN); no
  third-party map token. If a CDN needs signed tile URLs, sign them server-side.
- All Guide model calls and privileged data go through the Hono API.
- **Photos = POI evidence.** Photos exist only as evidence attached to a POI confirmation ("help other hikers"), added on POI Detail or the Stage Complete batch — never a personal journal. Upload direct to **R2 via presigned URLs** issued by the API; resize + thumbnail on ingest. Moderation is **light and report-driven** (`pending|approved|removed`); only approved photos surface publicly.
- **No in-app social feed.** The "community" lives in the trail data (reports → confidence), not likes/follows. An optional **journey share card** (route + stats) goes out to the OS share sheet; nothing is published to an in-app feed.

---

## 16. Design source (Figma)

The UI is fully designed — pull screens from Figma rather than inventing layouts.

- **File key:** `qooJ77tbwQb1dB7P3Htetf`
- **Access from Claude Code:** install the Figma MCP server, then reference a frame
  by link/selection. Requirements: Figma **desktop app**, a **Dev or Full (paid)
  seat**, and one of:
  - `claude plugin install figma@claude-plugins-official` (recommended), or
  - `claude mcp add --transport http figma-remote-mcp https://mcp.figma.com/mcp`, or
  - the local Dev Mode server at `http://127.0.0.1:3845` (Figma → Preferences →
    *Enable Dev Mode MCP Server*).
  Then `/mcp` to authenticate. Generate code from a selected frame, one screen at a
  time; assemble multi-screen flows screen-by-screen.

### Design tokens → typed theme (`apps/mobile/theme` or `packages/core`)
Mirror these Figma variables exactly:
- **Type (Inter):** Title SB 17 · Section Header SB 18 (-0.36) · Card Title SB 15 ·
  Stat Value SB 17 · Body Large R 17 · Body R 15 · Meta R 13 · Label SB 11 (0.6
  tracking) · Tab SB 11.
- **Radius:** sm 6 · md 7 · lg 8 · xl 12 · full 360.
- **Spacing:** 2 · 4 · 6 · 8 · 10 · 12 · 16 · 24.
- **Semantic colors:** `accent #494949` · `bg/app #f7f5f4` · `bg/surface #fdfcfc` ·
  `bg/subtle` · `bg/input` · `border/default` · `text/primary #494949` ·
  `text/secondary` · `text/on-accent #ffffff`.
- **Trail colors:** international `#c74538` · national `#2e6eb0` · gr `#7d57c2` ·
  local `#5c8c3d`.
- **Marker colors:** water `#3385bf` · refuge `#cc7333` · viewpoint `#2e9e8f` ·
  historic `#5c6b8f`.
- **Status (bg/text pairs):** warn (`#faeeda`/`#854f0b`), danger
  (`#fcebeb`/`#a32d2d`), info (`#e6f1fb`/`#185fa5`), success (`#e3efd9`/`#4a7a33`).
  Convention: **green = done, blue/info = active/current, neutral = upcoming,
  amber = caution/partial.**

### Screen inventory (node IDs in the file above)
| Screen | Node |
|---|---|
| 01 Home | `44:2` |
| 02 Search | `51:90` |
| 03 Map · 03b Map Filters | `141:672` · `211:745` |
| 04 Trail Detail — Overview | `53:205` |
| 05 Trail Detail — Sections | `96:547` |
| 06 Section Detail | `172:709` |
| 07 Peak route detail — Aneto (Vía Normal) | `173:720` |
| 07b Peak — Aneto · Overview / Routes | `307:1031` · `310:1038` |
| 08–12 Journey Setup (Step 1 → Review) | `63:295` · `65:330` · `67:375` · `68:390` · `81:411` |
| 13b Active Journey (full-screen map) · 13c Paused sheet | `83:430` · `224:1001` |
| 13b Active Journey — Itinerary (overrides) | `216:972` |
| 14 Stage Complete | `76:419` |
| 15/16 My Journeys (Active/Completed) | `77:425` · `85:439` |
| 17 Profile | `87:479` |
| 18 POI Detail | `164:651` |
| 19 Landing (web) · 19b Filters popover | `126:628` · `212:879` |

**Shared components (this iteration).** `IconButton` — a circular icon button with Style variants Subtle / Surface / Ghost and a swappable icon (the route **flip / switch** control; reusable for map and toolbar buttons). `Add Photo` — the photo-**evidence** tile (beside each Help-other-hikers confirmation, and on POI Detail’s *Latest photos*). A **peak reuses the trail-detail components verbatim** — hero, Stat Pills, scroll-tabs, Hazard Tag, list items, `section-row`, CTA Button — with the middle tab **Sections → Routes**; that tab swap is the only structural difference between a trail and a peak.

Step 1 shows the route as start → finish locations (**Irun → Cadaqués**) with a **flip** control to reverse it, plus **Start from / Finish at stage** pickers so a journey can cover any stage range; the pace step adds **Start / Finish dates** that imply daily distance (budgeted days → km/day). The Review step
shows the generated itinerary with **combined days** (fast pace) and a
**stay-options** chooser. Active-journey overrides live on `216:972` (mark complete
/ add rest day / tap-to-complete) and the **Pause** sheet `224:1001` (Resume / Stop
here for today / Finish stage / **End journey**).

**Trust UI (the curation model, §6, made visible).** POI Detail (`164:651`) is the
home of it: a **reliability card** (state + freshness + confidence, in status
colors), one-tap **Flowing / Trickle / Dry** report buttons (with an optional short note), and a recent-reports list. Map markers encode
confidence (solid = confirmed, muted/dashed = unconfirmed). The Guide phrases
answers by confidence — "flowing 2 days ago" vs "unconfirmed since May" (see the tip on `83:430`), and renders POI / water / refuge mentions as **tappable links** into their detail screens (§13). Stage Complete (`76:419`) marks the stage done and unlocks the next; below that primary action sits an **optional, de-emphasised "Help other hikers"** card for batch POI confirmation. POI confirmation happens **two ways**: in-the-moment on POI Detail (primary, accurate) and this optional end-of-day batch (a safety net) — the report chip is a **shared component** across both, and each confirmation can carry a **photo as evidence** — the reusable **Add Photo** tile, shrunk in beside the state chips here and reused at the end of POI Detail’s *Latest photos* strip. There is **no personal journal or reflection layer**: completed journeys show a **summary** (`244:1034`) of stats + the stage list, and an optional **share card** (`247:1049`) — route + stats out to the OS share sheet, never an in-app feed (§15).

---

## 17. Build order (walking skeleton)

Build **one trail end-to-end (GR11)** before adding breadth. Each phase is
shippable/demoable.

**POC spike (throwaway, ~2–3 days) — prove the core libs talk end-to-end.** Two
disposable repos, no monorepo/design-system/auth. The point is to de-risk the
native + offline parts of the stack before committing to structure.
- **Backend** — Bun + Hono + Drizzle over Postgres/PostGIS (Supabase or local
  Docker). One `trails` table with a `geom` column; seed a single GR11 LineString;
  expose `GET /trails/:id` returning it as GeoJSON via `ST_AsGeoJSON(ST_Simplify(...))`.
  Proves Drizzle connects and raw PostGIS SQL works.
- **Frontend** — Expo **custom dev client** (not Expo Go) + MapLibre + TanStack
  Query + Zustand + MMKV + SQLite (`op-sqlite`). Render a MapLibre map with an open
  base style, fetch the GeoJSON via TanStack Query and draw it as a line layer,
  then write the response to SQLite and read it back.
- **Done when:** the GR11 line renders on a real device from the API online, and
  still renders from SQLite with networking off (airplane mode). Anything that
  fights you here — MapLibre native build, dev client, PostGIS GeoJSON — gets
  solved cheaply now, not in phase 5.

0. **Scaffold** — monorepo, TS strict, lint/format, `packages/core` + `db` + `api`
   + `apps/mobile`. Expo dev client building locally. Theme file from §16 tokens.
1. **Data spine (thin seed)** — Drizzle schema + PostGIS on Supabase; hand-seed or
   thin-import a small GR11 subset *just to develop against*; compute chainage (§7).
   The real content build is its own phase (7), not this.
2. **Read API** — Hono endpoints: `GET /trails`, `/trails/:id` (+ sections, POIs,
   water as simplified GeoJSON), typed via shared `packages/core`.
3. **Map skeleton** — mobile app renders GR11 on MapLibre (open base style +
   markers) behind the `MapView` wrapper, plus the Trail Detail + Sections screens.
   Navigation + Zustand + TanStack Query wired.
4. **Journey Engine** — stage generation in `packages/core` (pure, tested); wire the
   Setup flow (08–12) and Review (combined days + stay options).
5. **Offline package** — bundle GR11 to R2; download into SQLite + register the
   offline map region; app works in airplane mode. Build the terrain + base-style
   workstream (§3) and the mutation outbox here.
6. **Active journey + overrides** — full-screen map (`83:430`), itinerary overrides
   (`216:972`), Pause sheet (`224:1001`), Stage Complete.
7. **Content ingestion + admin — the distinct content workstream (§8).** This is its
   own phase because content acquisition, not engineering, is the real bottleneck.
   Build the **config-driven pipeline** (`packages/pipeline`) and the **curation tool**
   (`apps/admin`), then run **GR11 fully through it**: OSM extract → normalise +
   chainage → model-enrich → **hand-finish GR11** in admin → seed a few condition reports so
   the living layer isn’t empty. Doing GR11 by hand *forges* the pipeline + admin tool
   that later scale to ~250 trails, where a new trail = a new config row (§8). Runs
   partly in parallel with 3–6, but the full build and hand-finish land here.
8. **Guide Core** — implement the §13 tools over chainage data; simple Q&A UI.
9. **Guide Cloud** — `/guide` proxy to Anthropic with the same tool schema.
10. **Guide Mini** — on-device spike (only after the rest are solid).

---

## 18. Conventions

- TypeScript **strict**; no `any` in `packages/core`.
- Shared types flow from `packages/core`/`db`; do not redefine API shapes in the app.
- Pure domain logic (engine, guide tools) has unit tests; spatial SQL has a small
  fixtures-based test on the GR11 seed.
- Commands (fill in once scaffolded): `bun install`, `bun run dev`,
  `bun run db:migrate`, `bun run db:seed`, `bun run typecheck`, `bun test`.

### Mobile styling rules (`apps/mobile`)
- **No hardcoded colours.** Every colour must come from `colors` or `colors.overlay` in
  `apps/mobile/theme/index.ts`. Never write `'#fff'`, `'rgba(...)'`, or any hex string
  directly in a component or screen file.
- **No hardcoded font strings.** Every `fontFamily` must reference `fonts.regular`,
  `fonts.semiBold`, or `fonts.bold` from the theme — never write `'Inter_600SemiBold'`
  or any font name directly. Use `type.*` tokens wherever they exist; add a new token
  to the theme when a combination is needed more than once.
- **No `fontWeight` overrides.** React Native custom fonts do not respond to `fontWeight`
  the same way as the web. Use the correct font face (`fonts.semiBold` / `fonts.bold`)
  instead of overriding weight on top of a different face.
- **Screens are thin.** Screens fetch data and compose components. Rendering logic lives
  in `components/ui/` (generic) or `components/trail/` (trail-specific). Extract any
  sub-component used more than once.
- **API shapes come from Orval.** Never hand-write API response types in the mobile app.
  Run `npm run codegen` after any API schema change; import types from `lib/hooks.ts`.

---

## 19. Roadmap (post-V1)

- **Phase 2:** *grow* the curation flywheel — richer community reports, water-reliability
  reporting, accommodation updates. The confidence model + report ingestion are
  **core (§6, §9), present from V1** — Phase 2 scales the loop, it doesn't invent it.
- **Phase 3:** trail graph, custom route generation, alternative routes. *(First
  point at which a routing graph is justified — see principle 4.)*
- **Phase 4:** global trail-knowledge platform, community-contributed intelligence,
  trail-specific recommendations.