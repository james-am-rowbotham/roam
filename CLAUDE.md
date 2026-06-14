# Roam — Project Guide

> Long-distance trail companion app. Plan a journey on a long trail (e.g. GR11),
> navigate it stage-by-stage with offline maps, and get help from an on-trail
> "Guide". This file is the canonical context for AI coding agents and humans.

Links for Figma designs and architectural designs:

https://www.figma.com/design/qooJ77tbwQb1dB7P3Htetf/Roam-Design?node-id=26-4&p=f&t=qmfn4isZO8yNlg2e-0

https://www.figma.com/board/7GOqbDRos3AI0LN2DPVMru/Roam-architecture?node-id=0-1&p=f&t=0sqrKWK9ncKFVXSB-0

---

## 1. Product in one paragraph

Roam turns a long-distance route into a personal, offline-capable journey. Two
objective types share one engine: **multi-day trails** (e.g. the GR11) and **peaks**
(e.g. Aneto, with several routes up). A user picks a route — a trail, a trail
segment, or one of a peak's lines — and sets direction, pace (or start/finish dates)
and an accommodation style; Roam **groups the trail's curated stages (etapas) into
days** by pace and suggests overnight stops. On trail, a full-screen map shows the
route, the user's position and nearby water/refuges, and a **Guide** answers questions
("where's the next water?", "will I make the refuge before dark?"). **Progress is
counted in stages, not days:** you complete a stage when you reach its end; pace is a
soft grouping hint (days re-group freely, pausing is a non-event), never a contract.

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
  basemap, OpenFreeMap, Versatiles, or a MapTiler open style) with the `map/*`,
  `trail/*` and `marker/*` tokens baked in; (3) self-hosting **glyphs + sprites**,
  including the trail-blaze sprite sheet (§17).
- **Strict `MapView` wrapper.** No renderer-specific types leak into screens;
  tile/source/style URLs live in config. This keeps a future swap (to Mapbox or
  MapTiler) a config-and-style task, not a refactor.
- **Map labeling is a designed system, not defaults** — see §17: four zoom bands
  keyed to hiker intent, painted-blaze trail shields, three-state POI markers,
  water-priority collision. Implemented in the style JSON + a thin overlay layer.

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
  last-write-wins is acceptable for V1. The outbox also carries **trail reports** —
  POI confirmations and condition updates captured offline ("help other hikers")
  queue locally and replay once back online. These are small JSON mutations, so the
  queue stays lightweight.

### Infrastructure
- **Fly.io** — Hono API + background jobs (OSM import, weather refresh via Open-Meteo).
- **Cloudflare** — CDN / DNS / (optionally Workers).
- **Cloudflare R2** — offline package bundles, exported vector tiles (PMTiles),
  static trail assets, and **user photos** (POI evidence; §9, §15).
- **Image handling** — on upload: resize + thumbnail; **light, report-driven
  moderation** (no heavy pipeline).
- **Notifications** — push via **Expo Notifications** (APNs / FCM) for weather
  warnings and journey reminders. Forecasts come from **Open-Meteo**, refreshed by
  the Fly weather job above.

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

Curated chain (all trail data): **Route → Section → Stage**. A **Journey** then
groups stages into **Days**. **This supersedes any earlier framing where a "stage"
was a generated per-journey day** — stages are curated trail facts, not generated.

The model is **three distinct concepts** (see §11 for the journey side):

| Concept | Answers | Granularity | Owner | Progress? |
|---|---|---|---|---|
| **Section** | which region am I in | coarse (~5 on GR11) | trail data | No — a label |
| **Stage** | today's walk (the etapa) | fine (~47 on GR11) | trail data | **Yes — the spine** |
| **Day** | how I group stages by pace | per-journey | the journey | No — planning layer |

- **Route** — a curated walkable line (geometry + chainage + metadata): the
  generalised core entity. A long-distance **Trail** is one long Route; a **Peak**
  ascent is a short Route to a summit. Carries an optional **grade** and **gear** for
  alpine/glaciated lines, and a **trail class** + **waymark** spec derived from OSM (§16).
- **Section** — a named **region** of the trail (e.g. GR11's Basque Country, Navarra,
  Aragon, Andorra, Catalonia), each owning a contiguous **range of stages**. Coarse,
  curated, orientation-only — **never counted as progress**.
- **Stage** — a curated unit of the trail (the official **etapa**: start/end chainage,
  distance, ascent, name like *Espinal → Burguete*, completion state). **The progress
  spine** — "Stage 14 of 47". Stages are trail data (official etapas, or a segmentation
  computed once at ingest for trails without one), **shared by every hiker, never
  generated per journey**. A peak is typically a 1–2 stage out-and-back.
- **Peak** — a summit objective that **groups several Routes** (the lines up).
- **Journey** — a user's plan/attempt of a Route (preferences, dates, status).
- **Day** — a **per-journey grouping** of consecutive stages by pace (one stage/day
  relaxed; two–three packed fast). Derived, not stored; carries no progress (§11).

Supporting entities: **POI, Accommodation, WaterSource, Hazard, TransportPoint**.
**Progress is only ever counted in stages** — never "section N of 5", never "day 11".

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
- **V2:** OSM → MVT (planetiler/tippecanoe, or **Martin** from PostGIS) → **z/x/y tiles**
  → MapLibre.

**Tile strategy (decided — see §10 for offline).** Self-host our own vector tiles;
never pack third-party tiles (MapTiler meters/caps offline; OpenFreeMap isn't an
offline-pack source — §3). Store the corridor as a **PMTiles archive on R2** (cheap
single file), fronted by a **Cloudflare Worker serving standard z/x/y MVT** — because
**`@maplibre/maplibre-react-native` cannot read PMTiles directly** (no `addProtocol`
on the native SDK). So PMTiles is the *storage* format; the device always consumes
**z/x/y**, online and offline. Ship our own outdoor base **style** + self-hosted
**glyphs + sprite sheet** (incl. blazes, §17) so everything resolves offline.

**Linear referencing (the core simplification).** Compute a **distance-from-start
(chainage)** value for the trail line and project every point feature (water,
refuge, hazard, transport, section boundary) onto it (`ST_LineLocatePoint` /
`ST_LineSubstring`); store that 1-D position. On-device questions ("next water",
"remaining ascent", "distance to next refuge") become **ordered 1-D lookups with no
spatial index needed offline** — which is why V1 avoids SQLite spatial extensions
and routing graphs entirely. Raw geometry is kept only for drawing.

Serve route geometry **simplified** (`ST_Simplify` / zoom-appropriate) from the
GeoJSON API; ship full-resolution geometry only inside the offline package.

**Elevation profile.** Sample the route line against a DEM at ingest and store an
ordered `{ chainage_m, elevation_m }` profile on the route (`routes.elevation_profile`);
the API serves the trail's full profile and each section's slice, and
`<ElevationProfile>` renders it. **Dev uses a coarse 1 km sample via the Open-Meteo
API** (rate-limits bursts → low-resolution; GR11 was backfilled at ~2 km). **In
production the pipeline must sample much finer (≈100–250 m, or DEM-native) against a
local DEM (ASTER/SRTM)** — no rate limit, smooth profiles. Only the sampler/source in
`packages/db/src/elevation.ts` changes; the API slice and component handle any
resolution.

---

## 8. Content ingestion pipeline (`packages/pipeline` + `apps/admin`)

Content acquisition — not engineering — is the real bottleneck for a content-heavy
product. Treat ingestion as a **repeatable, config-driven pipeline**, not a
per-trail script. Adding the 251st trail must cost almost nothing: it's a new
**config row**, not new code.

**Per-trail config** drives every run: `{ trail_id, osm_relation_id, country,
source_urls[], variant_rules }` (GR11 = OSM relation `68861`). The same five stages
run for any trail from its config:

1. **Extract (automated)** — pull the OSM route relation + members and nearby POIs
   (refuges `tourism=alpine_hut/wilderness_hut`, water `natural=spring` /
   `amenity=drinking_water`, campsites, peaks, `mountain_pass`, transport) via
   `osmium`/Overpass into a **staging schema**, untouched. Capture the route's
   `network`, `ref`, `name`, and `osmc:symbol` tags — these drive trail
   classification and the waymark (§16).
2. **Normalise (automated)** — transform staging → canonical tables; stitch members
   into one ordered LineString, pick the canonical line per `variant_rules`, then
   run **chainage** (§7). Resolve the **`waymark`** object by parsing `osmc:symbol`
   into the painted sign and keep the raw `network` tier as metadata — the
   symbol→parse→structure rule in §17.8.
   Stamp `source: osm`, `confidence: low`. This is the *draft trail* —
   complete-looking in an afternoon.
3. **Enrich (model-assisted)** — an LLM extraction pass over curated `source_urls`
   (official federation guides e.g. FEDME/FFRP, refuge sites, park bulletins,
   public trip reports) drafts the fields OSM lacks — refuge capacity/booking/season,
   water seasonality — and writes the per-section Guide summaries. `source: model`,
   unverified. Humans review, never author.
4. **Verify (human, via `apps/admin`)** — curators correct drafts, fix OSM gaps,
   and mark trusted facts `manual_override`. Only done in full for flagship trails.
   OSM classification is regionally inconsistent (§16), so the waymark/class is one
   of the things a curator confirms for flagship trails.
5. **Seed the living layer** — pre-fill a few condition reports from public trip
   reports + first-hand hikes (clearly attributed) so the living layer isn't empty
   at launch; the crowd flywheel (§6) then maintains it.

**Peaks run the same pipeline.** A summit (`natural=peak`) becomes an objective;
each ascent **route** (OSM route relations / well-known paths, or curated) is
normalised + chainaged like a short trail and grouped under the peak. Grade and
gear are model-drafted, human-verified.

**Properties that make this scale to ~250 trails:**
- **Idempotent + override-safe.** Stages 1–3 re-run automatically as OSM/sources
  improve; stage 4–5 human/crowd work (`manual_override`, confirmed values) is never
  clobbered. This is the single most important property.
- **Confidence is the universal currency** (§6, §9). Lets automated + model + human +
  crowd content coexist, and lets a trail **ship before it's hand-finished** —
  launched honestly as "OSM-grade, improving," upgraded in place.
- **Human effort scales sub-linearly by triage.** The model drafts all trails;
  curators touch only **low-confidence + high-consequence** items the system
  surfaces, and deep-finish only trails with real usage. Effort tracks demand, not
  trail count.
- **`apps/admin` is a first-class surface, not a script.** Reviewing drafts,
  resolving conflicting reports, fixing geometry is constant, forever work — it
  needs a real internal tool (authenticated CRUD over Postgres to start).

**Strategy: depth-first.** Hand-finish **GR11** fully through the pipeline first —
that forges the pipeline and admin tool. Then trails 2–20 are pipeline + light
finish on the popular ones; 20–250 are mostly automated, human attention only where
confidence is low and usage is high. Earn breadth by nailing depth once;
thin-everywhere erodes the trust that is the moat.

---

## 9. Database tables

`routes`, `trails`, `peaks`, `sections`, `stages`, `accommodations`, `water_sources`,
`transport_points`, `hazards`, `journeys`. **`sections` and `stages` are both curated
trail data** (§5): a route owns ordered `sections` (named regions), each owning a
contiguous range of ordered `stages` (the etapas: `start/end_chainage_m`, `distance_m`,
`ascent_m`, `name`, `completed`, `completed_at`, `elapsed_seconds`). The Journey Engine
**does not generate stages** — it groups them into days (§11).

> **Implementation status (current schema).** The above is the target naming. Today the
> `sections` table *is* the etapas (fine "Stage" layer); the coarse "Section" layer is a
> normalized **`regions`** table (`route_id`, `name`, `description`, `image_url`,
> `order_index`) that `sections.region_id` references (nullable FK — a stage may have no
> region). The API joins `regions.name` onto each section as `regionName`. The
> per-journey day-windows table is (confusingly) still named `stages` and carries
> **`elapsed_seconds`**; `journeys` carries **`pace`** (`relaxed|moderate|fast`). The
> remaining cleanup is purely the **rename** (`sections`→`stages`, `regions`→`sections`)
> — the relational model is now correct; only the names lag.

Each spatial/point table carries:
- `geom geometry(...)` for drawing/import, **and**
- `chainage_m double precision` (distance along the parent trail, §7), plus the
  parent `route_id` and ordering.

`routes` is the spine: a `trails` row **or** a `peaks` row links to one or more
`routes` (`route.trail_id` xor `route.peak_id`), and a route carries optional
`grade` + `gear`, plus the raw **`osmc_symbol`** + **`network`** tags. The
**`waymark`** object — `{ symbol, ref, network, review? }`, where `symbol` is the
parsed painted blaze (background/foregrounds/text + colours) — is produced by
`resolveWaymark` from those tags (§17.8). It **mirrors the OSM data**: store the raw
tags; resolve at the API boundary (or cache the parsed `symbol`). `network` is the
raw OSM tier (`iwn|nwn|rwn|lwn`), kept as-is for sort/filter, never the colour.
`sections` (regions) own a contiguous range of a route's `stages`.

`journeys` carry user ownership, status (`planned|active|paused|completed|abandoned`),
direction, pace and start/resume date. **Progress lives on the curated `stages`**
(`completed`, `completed_at`, `elapsed_seconds`) and is counted in stages + distance.
**Days are a derived per-journey grouping (§11) — there is no `day_index` on stages, no
stored day dates, and no `combined_stages`.** A multi-stage day is just a day whose
grouping references >1 stage; both stages stay first-class. Trail completion is computed
across journeys from walked stages, never a stored flag.

**Trust fields on every knowledge fact** (water/accommodation/hazard/…):
`source` (`osm|model|partner|community`), `confidence` (0–1, derived),
`last_confirmed_at`, `report_count`, and `manual_override` (protects a curated
value from re-import).

`reports` — crowd signals: `id`, `entity_type`, `entity_id`, `user_id`, `state`
(e.g. `flowing|trickle|dry`, `open|full`), `note`, `location`, `created_at`. A
fact's `confidence` + `last_confirmed_at` are recomputed from recent, weighted
reports (recency · reporter reliability · agreement). Reports are lightweight
text/state signals; user photos live in their own table.

`photos` — **POI evidence**: `id`, `user_id`, `poi_id` (the place it documents),
optional `report_id`, `r2_key`, `width`, `height`, `taken_at`, `moderation`
(`pending|approved|removed`, report-driven). Added when confirming a spot ("help
other hikers") — on POI Detail or the Stage Complete batch — and surfaced on POI
Detail's *Latest photos*. There is no personal journal/reflection layer.

---

## 10. Offline packages

A trail package (downloaded, stored in SQLite + cached tiles) contains: geometry,
sections, accommodation, water, food, transport, hazards, weather cache
(timestamped, with expiry), Guide summaries, and the resolved **waymark spec** per
route. **Optional:** the Guide Mini model.

- Two independent parts: **(a) data package** — a versioned manifest + data files in
  **R2**; client downloads, verifies, and writes to **SQLite** (low-risk, no tiles).
  **(b) map tiles** — `OfflineManager.createPack({ styleURL, bounds, minZoom, maxZoom })`
  downloads the corridor from **our own style** (§7) into MapLibre's **native offline
  pack**. NB: the device packs **z/x/y** tiles, not PMTiles (RN MapLibre can't read
  PMTiles); PMTiles is only the R2 storage behind the z/x/y Worker.
- The map style bundle ships the **trail-blaze sprite sheet** and glyphs so shields
  render offline (§17).
- Show download size and last-updated; re-download when a newer version exists.
  **Bump the style version when marker/blaze styling changes** or already-downloaded
  packs keep the old map styling. Weather is the only part expected to go stale
  offline — label it. The download is a real flow with a Wi-Fi-only toggle,
  progress, per-layer breakdown, pause, and background continuation (screen `12d`).

---

## 11. Journey Engine (`packages/core`)

Pure, deterministic, no I/O. The same code runs on the server and on device (offline).

**The engine does NOT generate stages** — stages are curated trail data (§5). Its job
is the **day grouping** and progress, not stage creation.

- **`groupStagesIntoDays(stages, pace)`** (`packages/core/src/days.ts`) — the core pure
  function: packs consecutive **whole** stages into days targeting a pace distance per
  day (one stage/day relaxed; two–three packed fast). A stage is **never split** across
  days, so the official etapa numbering stays intact. One stage longer than the target
  stands alone.
- **Progress is counted in stages + distance** ("Stage 14 of 47 · 228/820 km"), read
  from the curated stages' `completed` state. It survives pauses untouched.
- **Days are a forecast, not a contract.** Day dates are **derived** from
  `(start or resume date) + the grouping`, never stored. Pace is a **soft hint** that
  re-groups remaining stages — there is no "behind", no penalty, no booking-stranding
  logic. **Scheduling/finish-date forecasting was cut** — keep day dates quiet, no
  prominent finish forecast on the itinerary.
- **Pausing is a non-event.** Pause for days, resume navigation → stage progress
  unchanged; day dates simply re-anchor to the new "today" (recompute on resume).
  Nothing persisted, no catch-up, no dormant special-casing for progress.
- **Stage Complete fires per stage** (you complete a stage when you reach its end), even
  when a day groups two stages. Setup states global pace/dates only; Review is read-only.
- Deterministic given the same inputs; heavily unit-tested.

> **Superseded:** earlier drafts of this section had the engine *generate* per-journey
> stages and an at-Stage-Complete decision tree (*Walk as planned / Push on +N km /
> Rest day*) with booking-stranding warnings. That model is gone — no combine/split, no
> rest-day placement, no booking warnings. Stages are curated; days are a derived
> grouping; Stage Complete just starts the next stage.

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

**Entity references (clickable Guide answers).** Tools return entities with their
stable `id` and `type` (`poi` / `water_source` / `accommodation` / `hazard` /
`section` / `stage`), not just prose, so Guide answers reference them inline and the
client renders them as **tappable links** into the entity's detail screen — e.g. a
`getNextWater()` answer naming *Fuente de Góriz* links straight to POI Detail. Wire
format: the Guide emits `[label](roam://water_source/<id>)`-style links (or an
equivalent `{ text, entities: [{ span, type, id }] }` payload) so links resolve from
**stable ids, never by string-matching the name**; the client maps each `type` to
its screen and resolves the link against the **local package, offline**. Core
templates the references directly; Cloud/Mini are instructed to cite only ids
returned by tools — no invented links.

**Look-ahead drives the map.** The "upcoming POIs" the Guide talks about and the
POIs the map labels at navigation time come from the **same selector**, so the map
and Guide never disagree (§17.5).

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
- **Photos = POI evidence.** Photos exist only as evidence attached to a POI
  confirmation ("help other hikers"), added on POI Detail or the Stage Complete
  batch — never a personal journal. Upload direct to **R2 via presigned URLs**
  issued by the API; resize + thumbnail on ingest. Moderation is **light and
  report-driven** (`pending|approved|removed`); only approved photos surface
  publicly.
- **No in-app social feed.** The "community" lives in the trail data (reports →
  confidence), not likes/follows. An optional **journey share card** (route + stats)
  goes out to the OS share sheet; nothing is published to an in-app feed.

---

## 16. Design system & source (Figma)

The UI is fully designed — pull screens from Figma rather than inventing layouts.
This section is the canonical summary of the design system; the Figma file is the
source of truth for anything not captured here.

- **File key:** `qooJ77tbwQb1dB7P3Htetf`
- **Access from Claude Code:** install the Figma MCP server, then reference a frame
  by link/selection. Requirements: Figma **desktop app**, a **Dev or Full (paid)
  seat**, and one of:
  - `claude plugin install figma@claude-plugins-official` (recommended), or
  - `claude mcp add --transport http figma-remote-mcp https://mcp.figma.com/mcp`, or
  - the local Dev Mode server at `http://127.0.0.1:3845`.
  Then `/mcp` to authenticate. Generate code from a selected frame, one screen at a
  time.

### The design language in one paragraph
The type stack is **Bricolage Grotesque** (display/headings), **Hanken Grotesk**
(body/UI), **Geist Mono** (numerals, stats, uppercase labels) — no Inter. Neutrals
are warm (paper/charcoal, not cool gray). A **single green accent** drives all
primary actions, toggles, the active tab tint, and progress UI; there is no blue in
the system. The brand mark is a **blaze waymark** (red/cream GR bars). POI markers
are warm and carry white icons.

### Design tokens → typed theme (`apps/mobile/theme`)
Mirror these Figma variables exactly. A single `theme` object — no feature flag.

- **Type:**
  - Display: **Bricolage Grotesque** SemiBold 600. Title 17 (-0.085) · Section
    Header 18 (-0.09) · Card Title 15.
  - Body/UI: **Hanken Grotesk** 400/500/600/700. Body Large 17 · Body 15 · Meta 13 ·
    Body Strong 600 13 · Tab 500 10.
  - Mono: **Geist Mono** 400/500. Stat Value 500 16 (-0.08) · Data S 500 12 ·
    Data Meta 400 12 (+0.12) · Label 500 9.5 (+0.19).
  - Rule of thumb: digits and ALL-CAPS are mono; headings are Bricolage; language is
    Hanken. Never use Bricolage below 15px.
- **Radius:** sm 6 · md 7 · lg 8 · xl 12 · full 360. (Bound throughout component
  masters — consume tokens, never inline.)
- **Spacing:** 2 · 4 · 6 · 8 · 10 · 12 · 16 · 24. (Likewise bound.)
- **Semantic colors:** `accent #3D5A3F` (green) · `bg/app #FAF7F1` ·
  `bg/surface #FFFEFB` · `bg/input rgba(58,47,30,0.05)` ·
  `bg/subtle rgba(58,47,30,0.04)` · `border/default rgba(58,51,40,0.13)` ·
  `text/primary #26231E` · `text/secondary #6F6A60` (opaque) ·
  `text/on-accent #FFFFFF` · `text/tab-active #6F6A60`.
- **Brand:** `brand/blaze-red #D63A22` · `brand/blaze-cream #FAF4E8`.
- **Overlay (discovered in code, keep):** `dark rgba(28,24,20,0.35)` ·
  `darkStrong rgba(28,24,20,0.45)` · `frosted rgba(255,254,251,0.92)` ·
  `onImage #FFFFFF` · `onImageMuted rgba(255,255,255,0.85)`.
- **Status (bg/text pairs):** warn (`#FAEEDA`/`#854F0B`), danger
  (`#FCEBEB`/`#A32D2D`), success (`#E2EAE0`/`#3D5A3F`), **progress**
  (`#E2EAE0`/`#3D5A3F`). Convention: **green = done AND active/current/progress**
  (one accent), neutral = upcoming, amber = caution/partial. `status/info` is renamed
  `status/progress` (it only ever means "your progress"); blue is gone.
- **Map surfaces (unchanged):** `map/base #E8E4D8` · `map/road #FFFFFF` ·
  `map/green #D4E6C3` · `map/route #26231E` · `map/water #AACBD8` ·
  `map/contour #D8CFBE`.
- **Marker colors (warm):** `water #4D7A8C` · `refuge #A0683C` · `viewpoint #58836B`
  · `historic #7C6E5C` · `food #6B8456`. Markers do **not** use the accent: peak
  markers are `text/primary` charcoal; junction nodes are `bg/surface` fill + 2px
  `trail/sl` ring + `trail/sl` number.

### Trail classification & waymark (from OSM; full map treatment in §17, pipeline in §17.8)
Two independent things come from OSM, and conflating them is a mistake:
- **Class** comes from the **`network`** tag: `iwn` (international) · `nwn` (national)
  · `rwn` (regional) · `lwn` (local). We keep this **raw, as-is** — it's metadata
  that drives sorting, filtering, and zoom priority. E-paths (E6, E9…) are `iwn`. It
  does **not** pick a colour, and we do **not** relabel it (mirror OSM closely).
- **The blaze** comes from the **`osmc:symbol`** tag — the literal encoding of the
  painted waymark on the ground. We **parse it in full and rebuild the actual sign**;
  we do **not** snap it to a fixed palette.

**The waymark is built from the data, not bucketed (literal-symbol model).** A
pure parser in `packages/core` (`parseOsmcSymbol`, shared by map/legend/admin)
turns `osmc:symbol` (`waycolour:background[:foreground…][:text[:textcolour]]`) into
its painted parts — background plate, foreground marks (colour + shape), text and
text colour — each colour resolved through the **full osmc colour vocabulary**
(`red green yellow blue white black orange brown gray purple` → tuned hexes), plus
literal `#hex`. The renderer reconstructs the real sign from that structure. So GR11's
`red:white:red_lower:11:black` builds a **white plate with a red lower bar and "11"
in black** — its actual blaze — and any trail's colours come straight from its data.
There is **no three-token snap** and no derived class: the raw `network` tier is the
only sort/filter metadata, never the colour.

When `osmc:symbol` is absent there is no symbol to build — the route carries only its
raw `network` tier, and a curator decides the blaze in admin. Concurrency (two trails
sharing a path, e.g. GR11/HRP) renders as **stacked blazes**, one parsed symbol per
trail, mirroring real trail posts. Cap at two; 3+ shows the primary only.

**Blue is a non-hiking flag, not a colour to render.** A blue `osmc:symbol`
(equestrian/bike, or Swiss alpine difficulty) is flagged `review: non-hiking-blue`
in admin, not drawn as a trail. Route **lines** on the map are drawn in the
`osmc:symbol` **way colour** (`symbol.wayColor`, the first field — GR11 → red),
falling back to `map/route` ink when a route has no symbol. The blaze carries the
full painted sign; the line carries its colour.

### Components (`components/ui/`, `components/trail/`)
The component library. Reuse these; don't reinvent:
- **`Button`** — 7 variants: Solid (S/M/L, green) · Outline (S/M/L) · Danger Solid
  (M, red). There is no Ghost, Text, or separate CTA button — a full-width primary
  CTA is `<Button variant="solid" size="lg">`.
- **`IconButton`** — 3 variants: Surface M(34)/L(44) (surface fill, hairline, soft
  shadow — for buttons over maps/photos) · Subtle M (input tint — inline). The
  route flip/switch control, map/toolbar buttons, the active-journey •••.
- **`Chip`** (Option Chip) — Default/Selected, `label` prop, token-bound. All filter
  pills, season chips, and search suggestions. Selected = green fill. (The setup
  wizard's segmented controls are a separate pattern, intentionally not chips. The old
  Stage Complete decision chips are gone — §11.)
- **`ListItem`** — Detail (value + chevron) / Toggle / Toggle Off, props
  `title`, `value`, `icon` (swap), `showIcon` (boolean). All settings rows: Profile,
  Journey Settings, the Wi-Fi-only download row.
- **`AddPhoto`** — the photo-evidence tile (Help-other-hikers confirmations, POI
  Detail *Latest photos*).
- **`Waymark`** — the painted-waymark badge, **reconstructed from a parsed
  `osmc:symbol`** (§17.8): background plate + foreground marks + text, in the literal
  parsed colours (GR11 = white plate, red lower bar, "11"). Takes an `OsmcSymbol` prop.
  Renders above the route line on the map and in the legend; not a UI chrome element.
- **`ElevationProfile`** — the elevation silhouette (filled area chart, react-native-svg)
  in three modes from one component: **preview** (whole profile — `accent` fill @0.18 +
  `accent` line 1.75px; trail/section detail), **progress** (walked split — walked =
  `accent` fill @0.22 + `accent` line; remaining = `text/primary` fill @0.10 + ink line
  @0.28 1.25px; an `accent` marker dot with a 2px `bg/surface` ring at the walked point;
  journey cards), and **complete** (whole profile `accent` fill @0.22 + line; completed
  cards). Props: `data: number[]`, `mode`, `progress?` 0–1, `height?`. Downsamples to
  ~32 pts; the route profile comes from the stored DEM samples (§7).
- **Icons:** 24px grid, 2.0px stroke, round caps/joins, `text/primary` on paper,
  white on colored tiles. `icon/stay` (hut), `icon/water-bottle` (droplet+ripple),
  `icon/food` (pot), `icon/guide` (compass). Filled
  play/pause/more are intentionally solid.

### Screen inventory (node IDs in the file above)
Screens live on the Screens page (`26:4`) in six labeled rows; state/edge-case
screens sit inline beside their happy-path siblings.

| Screen | Node |
|---|---|
| 00 Location permission | `637:1424` |
| 01 Home · 01c First-run | `44:2` · `636:1375` |
| 02 Search · 02c No-results | `51:90` · `637:1446` |
| 03 Map · 03b Filters | `141:672` · `211:745` |
| 03c Section focus · 03d Full trail · 03f Offline | `647:1527` · `647:1616` · `637:1403` |
| 04 Trail Detail — Overview | `53:205` |
| 05 Trail Detail — Sections | `96:547` |
| 06 Section Detail | `172:709` |
| 07 Peak route detail — Aneto | `173:720` |
| 20 Peak Overview · 20b Routes | `307:1031` · `310:1038` |
| 08–11 Journey Setup (Steps 1–4) | `63:295` · `65:330` · `67:375` · `68:390` |
| 12 Review (read-only forecast) · 12d Download sheet | `612:49` · `639:1514` |
| 13a Active (map) · stats collapsed | `83:430` · `373:1112` |
| 13b Paused · Options sheet | `224:1001` · `511:1344` |
| 13c Itinerary / Settings tabs | `410:1201` · `407:1186` |
| 13d Finish sheet | `481:1257` |
| 14 Stage Complete (per stage; 14b Booking-affected removed — §11) | `612:174` |
| 15 Journeys · 15c Empty · 16 Completed | `77:425` · `636:1308` · `85:439` |
| 17 Profile (with Account/sync row) | `87:479` |
| 18 POI Detail | `164:651` |
| 19 Landing (web) | `126:628` |

**A peak reuses the trail-detail components verbatim** — hero, stat pills,
scroll-tabs, hazard tag, list items, `section-row`, Button — with the middle tab
**Sections → Routes**; that tab swap is the only structural difference.

### Key flow notes
- **Journey Setup.** Step 1 shows the route as start → finish (**Irun → Cadaqués**)
  with a flip control; the Start/Finish **stage pickers only appear for "Specific
  section,"** not for the full trail. The pace step adds Start/Finish dates implying
  daily distance. (The old per-step **estimate ribbon** is removed — scheduling was
  cut, §11.) **Review (`12`) is read-only** — the itinerary, no editing
  controls, a "forecast not a contract" note, and an **Adjust pace ›** link back to
  Step 3. (Add-rest-day / combine-days are gone — §11.)
- **Active journey.** One **control bar** across map (`83:430`) and itinerary
  (`410:1201`): **Pause** (outline) ⇄ **Resume** (solid) — immediate, reversible, no
  confirm — beside a **••• (More)** button (IconButton Surface). Paused state has
  **no status chip** except a small context chip ("PAUSED · STAGE 5 · …"); the Resume
  button signals it. Secondary actions live in the ••• sheet (`511:1344` map /
  `481:1257` itinerary): Itinerary/Map · Ask guide · Finish stage · Finish journey.
  **Finish stage** → Stage Complete; **Finish journey** is danger + confirm. The
  itinerary is a **day-grouped, read-only progress view** (§16 itinerary: section
  region bands › day-group headers › stage rows; done ✓ / current / upcoming) — no
  insert/edit affordances.
- **Itinerary (`410:1201`, mock `846:1752`).** Progress header — "Stage N of M" +
  distance, the **ElevationProfile** (progress mode), and a quiet **pace line** (the
  only place pace surfaces; no "Day N of M", no prominent finish forecast). Then the
  list interleaves **section region bands** ("Basque Country · STAGES 1–7", a hairline
  rule marks each region crossing), **day-group headers** (`DAY 3 · 14 JUN` +
  `2 STAGES · 8H 30M` done / `DAY 5` + `2 STAGES · 38 KM · 900M ↑` upcoming; time-taken
  lives on the day), and **stage rows** (28×28 fixed badge; "Stage N · Place → Place";
  meta `18 km · 650m ↑ · Easy`). History stays visible.
- **Pace (Settings tab).** A segmented **Relaxed / Moderate / Fast** in the journey
  Settings, adjustable mid-journey. Changing it **re-groups only the remaining (unwalked)
  stages into days** — completed days and stage progress are untouched (history is real),
  the current day is the boundary, only the future regroups. A **soft consequence note**
  shows the shift ("…regroups your remaining days — finishing about 5 days sooner.") —
  informational, never an "are you sure"; reversible and un-punishing (pace is a soft
  hint, §11). Persisted on the **`journey.pace`** column via `updateJourney` (with an
  optimistic draft for instant regrouping).
- **Stage Complete (`14`)** fires **per stage** when you reach its end: "STAGE N
  COMPLETE", the leg + stage stats, a Guide lead-in about the **next stage** ("NEXT
  STAGE"), and a single **"Start now"** CTA. **No day-decision chips, no rest-day/
  push-on, no booking-affected `14b`** (all removed — §11). An optional, de-emphasised
  **"Help other hikers"** card for batch POI confirmation can sit below.
- **Trust UI.** POI Detail (`164:651`) is the home: a reliability card (state +
  freshness + confidence, in status colors), one-tap Flowing/Trickle/Dry report
  buttons (+ optional note), recent-reports list, and *Latest photos*. Map markers
  encode confidence (solid = confirmed, muted = unconfirmed). The Guide phrases by
  confidence ("flowing 2 days ago" vs "unconfirmed since May") and renders POI/water/
  refuge mentions as tappable links (§13).
- **No personal journal.** Completed journeys show a stats **summary** + stage list
  and an optional **share card** to the OS share sheet — never an in-app feed (§15).

---

## 17. Map labeling (MapLibre)

What the map shows at each zoom is a designed system, not renderer defaults. Label
density is keyed to **hiker intent** and expressed as MapLibre zoom-stop expressions
in the style JSON — the renderer does the work; the app only overrides for two
context cases (§17.6). Principle: at any zoom, show only what the hiker can act on at
that zoom (zoomed out they orient — which trail, where; zoomed in they decide — is
there water before that climb).

### 17.1 Four zoom bands
Boundaries are tunable; the *content rules* are the contract.

| Band | Zoom | Intent | Trail blaze | Section names | POI markers |
|---|---|---|---|---|---|
| Overview | 0–8 | which trail, where | one, at the start terminus | hidden | hidden |
| Regional | 9–11 | plan the days | repeating, wide spacing | midpoint pill labels | major refuge + day-end towns, as dots |
| Tactical | 12–14 | today | repeating, normal spacing | fade out | all types, icon-only pins, no text |
| Detail | 15+ | the next hour | repeating, normal spacing | hidden | pins + text labels + reliability dot |

Two terminus blaze waymarks (start/end) are always present at all bands as point
symbols.

### 17.2 The trail blaze (`Waymark`, §16)
The repeating waymark riding above the route line — the most distinctive element of
the map, and what lets section names stay off the line entirely (the route carries
its own identity continuously). It is the **reconstructed painted sign**, built from
the parsed `osmc:symbol` (§17.8): a background **plate** (its colour + shape), the
**foreground marks** over it (each its own colour + shape, e.g. a red `lower` bar),
and the **text** in its text colour. GR11 (`red:white:red_lower:11:black`) is a white
plate with a red lower bar and "11". Every colour is the literal parsed colour — there
is no per-class palette. The plate renders **directly above the line point** (no stem)
and stays upright regardless of line angle (`*-rotation-alignment: viewport`).

**Rendering — sprite per unique symbol.** The painted sign is too structured for a
plain text-fit sprite, but the set of distinct `osmc:symbol` values in a pack is small
(a trail usually has exactly one). So a build step renders **one sprite per unique
parsed symbol** — drawing plate + marks + text to a PNG — and the route feature
carries a stable `symbolKey` (a hash of the parsed structure). The layer keys
`icon-image` off `symbolKey`; placement is `symbol-placement: line`, `symbol-spacing`
~400px at z8 → ~200px at z14 (tune on device), `symbol-avoid-edges: true`,
`*-allow-overlap: false`. Drive the sprite drawing from the **same `parseOsmcSymbol`
output and colour vocabulary** as the RN `Waymark` component, so map and UI never
drift. Few-at-a-time cases (terminus blazes, concurrency) render as RN `Waymark`
overlays (§17.5) reading the same parsed structure.

```js
// Trail blaze layer (sketch) — one pre-rendered sprite per distinct parsed symbol
{
  id: 'trail-blaze', type: 'symbol', source: 'trails', 'source-layer': 'route',
  layout: {
    'symbol-placement': 'line',
    'symbol-spacing': ['interpolate', ['linear'], ['zoom'], 8, 400, 11, 260, 14, 200],
    'icon-image': ['concat', 'blaze-', ['get', 'symbolKey']], // hash of the parsed osmc:symbol
    'icon-offset': [0, -6],
    'icon-rotation-alignment': 'viewport',
    'symbol-avoid-edges': true, 'icon-allow-overlap': false,
  },
}
```

Tile data: the route source exposes `symbolKey` per feature (text lives inside the
pre-rendered sprite, not as a separate `text-field`).

**Concurrency.** Where two trails share a path (e.g. GR11/HRP in the Pyrenees),
render **stacked waymarks** — one parsed sign per trail, vertically — mirroring real
trail posts. Cap at two; for 3+ show only the primary trail's blaze (secondaries are
discoverable by tapping the line). Stacked blazes are the few-at-a-time case, so
render them as RN `Waymark` overlays (§17.5) on concurrency segments.

### 17.3 POI markers — three states
One concept, three rendered states by zoom + context (§16 marker colors; white icon
on the tile):

| State | When | Render |
|---|---|---|
| Dot | Regional band, `Essential` density, or collision-thinned | tinted circle ~9px, white 1.5px ring, no icon |
| Pin | Tactical band | tinted circle 26px, white 2px ring, white icon (~56% of pin), soft shadow |
| Labeled | Detail band, or selected, or next-ahead | pin + label chip (surface fill, hairline, name in Geist Mono ~10px; water adds a reliability dot) |

Two markers stay off the tinted-pin pattern (§16): **peak** = `text/primary`
charcoal; **junction node** = `bg/surface` fill + 2px `trail/sl` ring + number.

Labels fade rather than pop:
`'text-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 1]`.

**Priority & collision.** Water always wins a label collision (a missed water source
is the only dangerous POI mistake):

```js
'symbol-sort-key': ['match', ['get', 'poiType'],
  'water', 1, 'refuge', 2, 'junction', 3, 'food', 4, 'viewpoint', 5, 'historic', 6, 9],
'text-allow-overlap': false, 'icon-allow-overlap': false, // lower = higher priority
```

A label that loses a collision does not vanish — the marker stays a pin/dot, only the
text drops. That is the designed "dropped" state.

### 17.4 Native layers vs RN overlays
- **Native MapLibre symbol layers:** trail blazes, POI dots/pins, terminus blazes —
  numerous, need native collision + zoom expressions, live in the style JSON.
- **RN overlays (`MarkerView`):** selected-POI callout, next-ahead labels, stacked
  concurrency blazes — few at a time, need exact token match + tap interaction.
- Rule of thumb: >~20 possible on screen → native symbol layer; a handful that must
  look like a UI component → RN overlay.

### 17.5 Context overrides (app-driven, ignore zoom)
1. **Active-journey look-ahead** — the next 2–3 POIs ahead on the route always show
   labels (even at Tactical band) because the Guide is talking about them. Drive the
   map and the Guide from the **same "upcoming POIs" selector** (§13) so they never
   disagree. Implement via a `lookahead` feature-state or RN overlays.
2. **Tap to promote** — tapping a marker promotes it to a full labeled callout (RN
   overlay) with name + reliability + type and dims the others; tap-away dismisses.

### 17.6 Density toggle & section names
- **Density toggle** — a Subtle `IconButton` on the map cycles `Essential` (water +
  refuge only, dots) / `Standard` (the band rules, default) / `All` (labels one band
  earlier). Persist per user. `Essential` is also the performance floor for old
  phones deep in a pack.
- **Section names** appear only at Regional band, as faint paper midpoint pills
  (`bg/app` ~92%, Geist Mono ~9px) — never path-following (unreadable on switchbacks;
  the blaze carries continuous identity). Fade out by z12, where the on-trail stage
  label takes over.

### 17.7 Deferred (not blocking)
- A dedicated reliability scale (flowing / low / unconfirmed) instead of the water
  dot borrowing `trail/sl` green.
- Concurrency sprite-vs-overlay final call depends on how many distinct pairs exist
  in the catalog — count, then choose.
- Band zoom boundaries are first-guess; calibrate on device against GR11 tiles.

### 17.8 Rendering trail colours & blazes (data-driven, literal-symbol)
The blaze is **not** a fixed enum keyed off trail class, and **not** a snap to a
three-colour palette — it is the **actual painted sign parsed out of each route's OSM
`osmc:symbol`** and rebuilt. We parse the symbol once (shared pure function), store
the raw tag, and render the reconstructed sign. The flow:

**symbol → parse → structure → store → build sign.**

1. **Extract** (pipeline, §8) — capture the route relation's `network`, `ref`, `name`,
   and `osmc:symbol` tags into staging. These live on the **relation**, not the member
   ways (only a few ways carry them incidentally) — read them from the relation.
2. **Parse** (`parseOsmcSymbol` / `resolveWaymark`, pure in `packages/core`, shared by
   map/legend/admin) — turn `osmc:symbol`
   (`waycolour:background[:foreground…][:text[:textcolour]]`) into an `OsmcSymbol`:
   - `wayColor`, `background` (colour + shape), `foregrounds[]` (each colour + shape),
     `text`, `textColor` — every colour resolved through the **full osmc colour
     vocabulary** (`red green yellow blue white black orange brown gray purple` → tuned
     hexes) or a literal `#hex`. **No snap to gr/pr/sl.**
   - The raw `network` tier is carried through **as-is** (no relabelling) as
     sort/filter metadata — it is never the colour.
   - **Blue is a flag, not a colour:** a blue trail/background sets
     `review: 'non-hiking-blue'` (bike/horse/Swiss alpine) — surfaced in admin, not
     drawn as a hiking trail.
   - No `osmc:symbol` → `symbol: null` (nothing to build; curator decides), keeping
     the raw `network`. No symbol and no network → `review: 'unresolved'`.
3. **Store** — write raw `osmc_symbol` + `network` on the route row (§9). Resolve to the
   `waymark` object at the API boundary, or cache the parsed `symbol`.
4. **Serve** — the route feature carries the resolved `waymark` (the parsed `symbol`,
   `ref`, raw `network`) plus a stable `symbolKey` (hash of the parsed structure).
5. **Build the sign** (on device, offline) — the RN `Waymark` component draws the plate
   + foreground marks + text from the structure; the map uses a sprite pre-rendered
   per distinct `symbolKey` from the *same* parser output (§17.2). One drawing
   definition, three surfaces (map sprite, RN overlay, legend).

**Why the sprite set stays small without snapping.** The set of *distinct*
`osmc:symbol` values in a pack is tiny (a trail typically has exactly one), so
rendering one sprite per unique parsed symbol is finite in practice — we keep the
literal sign *and* a bounded sprite sheet. **E-paths are not a special case:** the E9
across the Pyrenees carries the GR11's `red:white:red_lower:…` symbol, so it builds the
same red-and-white sign — while keeping `network: iwn` as separate metadata. The parser
is the one piece of real judgment; it lives in `packages/core` as a pure, tested
function so map, legend, and admin share exactly one definition.

---

## 18. Build order (walking skeleton)

Build **one trail end-to-end (GR11)** before adding breadth. Each phase is
shippable/demoable.

**POC spike (throwaway, ~2–3 days) — prove the core libs talk end-to-end.** Two
disposable repos, no monorepo/design-system/auth. The point is to de-risk the
native + offline parts of the stack before committing to structure.
- **Backend** — Bun + Hono + Drizzle over Postgres/PostGIS (Supabase or local
  Docker). One `trails` table with a `geom` column; seed a single GR11 LineString;
  expose `GET /trails/:id` returning it as GeoJSON via `ST_AsGeoJSON(ST_Simplify(...))`.
- **Frontend** — Expo **custom dev client** (not Expo Go) + MapLibre + TanStack
  Query + Zustand + MMKV + SQLite (`op-sqlite`). Render a MapLibre map with an open
  base style, fetch the GeoJSON, draw it as a line layer, write to SQLite and read
  it back.
- **Done when:** the GR11 line renders on a real device from the API online, and
  still renders from SQLite with networking off (airplane mode).

0. **Scaffold** — monorepo, TS strict, lint/format, `packages/core` + `db` + `api`
   + `apps/mobile`. Expo dev client building locally. **Theme file from §16 tokens.**
1. **Data spine (thin seed)** — Drizzle schema + PostGIS on Supabase; hand-seed or
   thin-import a small GR11 subset just to develop against; compute chainage (§7).
2. **Read API** — Hono endpoints: `GET /trails`, `/trails/:id` (+ sections, POIs,
   water as simplified GeoJSON), typed via shared `packages/core`.
3. **Map skeleton** — mobile app renders GR11 on MapLibre (open base style +
   markers) behind the `MapView` wrapper, plus Trail Detail + Sections. The map
   labeling system (§17) starts here: trail blaze + basic POI pins. Navigation +
   Zustand + TanStack Query wired.
4. **Journey Engine** — `groupStagesIntoDays` day-grouping in `packages/core` (pure,
   tested; the engine groups curated stages, it does not generate them — §11); wire the
   Setup flow (Steps 1–4) and the **read-only Review** + the day-grouped itinerary (§16).
5. **Offline package** — bundle GR11 to R2; download into SQLite + register the
   offline map region; app works in airplane mode. Build the terrain + base-style
   workstream + blaze sprite sheet (§3, §16) and the mutation outbox here. Real
   download flow (`12d`).
6. **Active journey + decisions** — full-screen map (`83:430`), itinerary tabs
   (`410:1201`, read-only), the shared Pause/Resume · ••• control bar, the ••• sheet,
   **Stage Complete decision card + booking-affected state** (§11).
7. **Content ingestion + admin — the distinct content workstream (§8).** Build the
   config-driven pipeline (`packages/pipeline`) and curation tool (`apps/admin`),
   then run **GR11 fully through it**: OSM extract (incl. `network`/`osmc:symbol`) →
   normalise + chainage + class/waymark resolution → model-enrich → hand-finish in
   admin → seed a few condition reports. Runs partly in parallel with 3–6.
8. **Guide Core** — implement the §13 tools over chainage data; Q&A UI; entity links.
9. **Guide Cloud** — `/guide` proxy to Anthropic with the same tool schema.
10. **Guide Mini** — on-device spike (only after the rest are solid).

---

## 19. Conventions

- TypeScript **strict**; no `any` in `packages/core`.
- Shared types flow from `packages/core`/`db`; do not redefine API shapes in the app.
- Pure domain logic (engine, guide tools) has unit tests; spatial SQL has a small
  fixtures-based test on the GR11 seed.
- Commands (fill in once scaffolded): `bun install`, `bun run dev`,
  `bun run db:migrate`, `bun run db:seed`, `bun run typecheck`, `bun test`.

### Mobile styling rules (`apps/mobile`)
- **No hardcoded colours.** Every colour comes from `colors` / `colors.overlay` in
  `apps/mobile/theme/index.ts`. Never write `'#fff'`, `'rgba(...)'`, or any hex
  directly in a component or screen.
- **No hardcoded font strings.** Every `fontFamily` references the theme `fonts.*`
  (Bricolage/Hanken/Geist Mono faces) — never write `'HankenGrotesk_400Regular'`
  directly. Use `type.*` tokens where they exist; add a token when a combination
  recurs.
- **No `fontWeight` overrides.** RN custom fonts don't respond to `fontWeight` like
  the web. Use the correct face (e.g. `fonts.body.semibold`) instead.
- **Screens are thin.** Screens fetch + compose; rendering logic lives in
  `components/ui/` (generic) or `components/trail/` (trail-specific). Extract any
  sub-component used more than once.
- **API shapes come from codegen.** Never hand-write API response types in the
  mobile app. Run codegen after any API schema change; import generated types.

---

## 20. Roadmap (post-V1)

- **Phase 2:** *grow* the curation flywheel — richer community reports,
  water-reliability reporting, accommodation updates. The confidence model + report
  ingestion are **core (§6, §9), present from V1** — Phase 2 scales the loop.
- **Phase 3:** trail graph, custom route generation, alternative routes. *(First
  point at which a routing graph is justified — see principle 4.)*
- **Phase 4:** global trail-knowledge platform, community-contributed intelligence,
  trail-specific recommendations.