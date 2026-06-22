# Content Pipeline — design

> How trail/peak knowledge and editorial content are ingested, enriched, reviewed,
> persisted in Postgres, and compiled into offline packages. Extends CLAUDE.md §8
> (ingestion) and §21 (content). This doc is the plan of record; the code is the truth.

## 1. Status

- **Exists today:** config-driven structural pipeline (`packages/pipeline`, `TRAIL_DEFS`),
  GR11 + GR10 seeded into Postgres, an LLM enrich stage (`pack:content`, Anthropic
  web-search) that writes **JSON files** (`packages/db/content/*.json`), and a pure pack
  builder (`buildTrailPack`) compiling to `apps/mobile/assets/content/seed.json` (bundled).
- **Gaps this plan closes:** editorial content lives in repo files + hard-coded in
  `build.ts`, **not** in Postgres (the `content_blocks`/`content_media` tables exist but are
  unpopulated); POI ingestion is hard-coded per type; peaks aren't through the pipeline; no
  admin portal; no background runner; no automated review/check stage.

## 2. Requirements (target)

1. **Config-driven** — adding a new POI type (or objective, or content lens) is *adding a
   variable*, not writing code.
2. **Objectives = trails + peaks.** Trails own **sections** (coarse regions) and **stages**
   (etapas) — already correct. Peaks group **routes**.
3. **Persist content in Postgres so the web can query it.** Offline is a later option:
   pull a per-objective **package** to on-device storage.
4. **Callable, idempotent, background-capable.** Each stage runs independently and re-runs
   safely; long runs go to a background worker on the Hono/Fly setup.
5. **Admin portal** — clear review-before-publish, with edits.
6. **LLMs at stages** — writing, web search, and an automated review/check pass before a
   human sees it.
7. **Content scope** — pull trail data + POIs, then as much web-sourced material as possible,
   to present a **guide**. Static about the objective now; **dynamic later** (weather, refuge
   booking, adaptive) — kept on the *live* side of the §21.1 boundary, never mixed into the
   editorial store.
8. **Map-anchored content (where possible, always link to the map).** Every content reference
   to a place or feature resolves to a **scoped, filtered map view**. A highlight carries a
   chainage/coordinate and shows as a tappable point on the trail; a water/refuge/POI mention
   links to that entity on the map (§13 entity refs); a stage's "5 refuges" summary opens the
   **stage's map slice with the refuge layer on**. Prose and map never diverge — both read the
   same linearly-referenced data (§7) and the same look-ahead/POI selector (§17.5). See §4.5.

## 3. Architecture — the stage pipeline

```
config (objective defs + POI registry)
  → EXTRACT   OSM/Overpass: route relation + POIs                [auto, idempotent]
  → NORMALISE stitch → chainage → waymark                        [auto, idempotent]
  → ENRICH    LLM web-search → guide content (blocks + media)    [LLM: write]
  → CHECK     sourced? confident? on-topic? license-clean?       [LLM + rules]   ── gate
  → REVIEW    admin portal: edit · regenerate · approve          [human]         ── gate
  → PUBLISH   review_status = published
  → PACK      compile per-objective → R2 → device SQLite         [auto]
```

Every arrow is a **callable, idempotent stage**. State lives in Postgres between stages, so
any stage can re-run, and the human/crowd work (`manual_override`, approvals) is never
clobbered (the §8 invariant).

## 4. Data model

### 4.1 Objectives (trails + peaks)
Generalise `TRAIL_DEFS` → `OBJECTIVE_DEFS` with `type: 'trail' | 'peak'`. A trail is one long
route owning sections+stages; a peak groups several routes (the lines up), each normalised +
chainaged like a short trail. Same five stages run for both (CLAUDE.md §8 "peaks run the same
pipeline").

### 4.2 POI registry (config-driven)
Replace the hand-written `seedWaterSources`/`seedAccommodations` (hard-coded Overpass tags +
separate tables) with a **registry** consumed by one ingest loop:

```ts
// packages/pipeline/src/pois.ts (new)
interface PoiKind {
  key: string;                 // 'water' | 'refuge' | 'spring' | 'viewpoint' | …
  category: string;            // grouping for the unified table
  overpass: string[];          // tag filters, e.g. ['natural=spring','amenity=drinking_water']
  proximityM: number;          // max distance from the route line to attach
  marker?: string;             // map marker token
}
```

Adding a POI type = one registry entry. **Decision (recommended): one unified `pois` table
with a `category` column**, rather than typed tables — that is what makes "add a variable"
literally true. (Typed tables would force a migration + new seed fn per type.) Trust fields
(`source`, `confidence`, `last_confirmed_at`, `report_count`, `manual_override`) live on every
POI row regardless (§9).

### 4.3 Content storage — the key decision
**The content *structure* must not live in the database schema.** The schema stores identity
and trust; the **shape** is owned by one versioned definition.

`content_blocks` columns split into two parts:

- **Stable envelope** (about curation/trust — changes ~never):
  `scope_type` (`route|region|stage|poi`), `scope_id`, `lens`, `order_index`,
  `source` (`derived|parse|model|partner|authored`), `confidence`, `review_status`
  (`draft|reviewed|published|flagged`), `source_refs jsonb`, `manual_override`,
  `season_from/to`, `last_reviewed_at`.
- **Renderable content as validated `jsonb`** — the `ContentBlock` from
  `packages/content/src/blocks.ts`, plus a **`schema_version int`**. **Not** a `block_type`
  enum + typed `body`/`title` columns (today's rigid shape, to be reconciled in P1).

So there is **one source of truth for content shape — the `ContentBlock` union in
`@roam/content`** — already shared by the app renderer and the pack builder. The DB hooks into
the *same* union (validates JSON on write); the pack and app already consume it. Adding
`detailList`/`reliability` this week was a one-package edit that flowed everywhere — the DB
must not break that.

`content_media` keeps its hard license gate (`source_site/license/license_url/author/
attribution_text` all `NOT NULL`) and a provider-agnostic `storage_key` (R2).

### 4.5 Map anchors (req. 8)
Content blocks carry an optional **map anchor** so the renderer can make them tappable into a
focused, filtered map — reusing the infra already built (`focusStage`/`focusSection`,
`NativePOILayer` filtering, §13 entity links). The anchor is part of the validated `ContentBlock`
payload (§4.3), so it travels with the content and needs no schema change:

```ts
// added to the ContentBlock union (additive)
mapAnchor?: {
  scope: 'route' | 'section' | 'stage';   // what to frame
  scopeRef?: string;                       // section/stage id; defaults to the block's scope
  poiFilter?: string[];                    // POI categories to show (e.g. ['refuge'])
  chainageM?: number;                      // a single point (highlight photo) on the line
}
```

Concretely: **highlights** get a `chainageM` (linearly referenced at ingest, §7) → a tappable
point; **POI-summary blocks** ("5 refuges") get `{ scope:'stage', poiFilter:['refuge'] }` → open
the stage slice with that layer on; **water/accommodation mentions** stay §13 entity links.
Pure-narrative blocks with no place stay text. The map view this opens is the *same* one the
guide describes — one selector, never two sources of truth.

### 4.4 The narrow waist
```
packages/content/src/blocks.ts  (ContentBlock union + zod validator + schema_version)
        ▲ writer (enrich)   ▲ DB (jsonb, validated)   ▲ reader   ▲ pack   ▲ app   ▲ web   ▲ admin
```
One definition; every consumer references it. Change content shape in one place.

## 5. Pipeline stages (callable + idempotent)

| Stage | Input | Output | Engine |
|---|---|---|---|
| **extract** | objective config | staging: route relation, POIs | Overpass (cached files today) |
| **normalise** | staging | `routes/regions/sections/pois` + chainage + waymark | PostGIS, pure parsers |
| **enrich** | sources + scopes | `content_blocks` (model) + `content_media` | LLM web-search |
| **check** | draft blocks | `review_status`, `confidence`, flags | LLM + rules |
| **review** | reviewed/flagged blocks | `published` (or edits) | human (admin) |
| **pack** | published blocks + knowledge | per-objective package → R2 | pure `buildPack` |

Idempotency: extract/normalise/enrich re-run from sources; `manual_override` + approvals are
never overwritten. `pack` is pure and re-runnable.

## 6. LLM integration points
- **Write** (enrich): web-search the curated `source_urls` + open web → typed blocks in Roam's
  voice, emitting `source: model`, a derived `confidence`, and `source_refs[]` per block
  (sourced, never free-floating — §21.10). *Persisting `source_refs` is a current bug to fix.*
- **Check** (new, pre-review): verify each block is sourced, on-topic for its scope/lens, and
  not internally contradictory; flag hallucination risk; set `review_status: reviewed|flagged`
  + `confidence`. Cheap triage so curators only see low-confidence / high-consequence blocks.
- **Image vision pass** (§21.4): caption, geo-match, reject blurry/indoor/watermarked/wrong-place.

## 7. Persistence & web querying
Content lives in Postgres → the Hono API exposes read endpoints over `content_blocks`/
`content_media` (filter by scope + lens + season + `review_status=published`). The web app
queries those directly (online). The mobile app reads the **compiled package** (offline).

## 8. Offline packages (later — Phase 5 / P7)
`pack` compiles a published objective into a versioned bundle on R2 (data) + a tile corridor
(map). Device downloads → SQLite + native tile cache. The §21.6 RAG embeddings ride inside the
package. Keep the §10 split: data package (low-risk) vs map tiles (heavy).

## 9. Admin portal (`apps/admin`)
Small Next.js app (matches `apps/web`), Supabase-authenticated. Per objective: list scopes →
blocks with provenance/confidence/sources visible → **edit · regenerate · approve · delete**
(`draft → reviewed → published`), and **trigger pipeline stages**. Reuses the content renderer,
so new block types appear automatically; review controls operate on the envelope, so they are
structure-agnostic.

## 10. Background execution (Hono / Fly)
Each stage is callable as a Hono endpoint (`POST /admin/objectives/:id/pipeline/:stage`). Long
runs go to a background worker via a **managed queue (DECIDED)**. Primary: **Supabase Queues
(pgmq)** — Postgres-native, managed, transactional with our own data, no new vendor; admin
**enqueues** a stage, a Bun worker on Fly **consumes** it. If multi-step LLM orchestration
(per-step retries, concurrency limits, observability) outgrows a plain queue, graduate to a
**durable-workflow engine** (Inngest / Trigger.dev) — the worker boundary stays the same.
Rate-limit pacing lives in the worker (Open-Meteo: ~500 coords/min, under the 600/min +
5000/hour free caps — already baked into `refresh-elevation`).

## 11. Changing content structure
Because shape lives in `@roam/content` (not the schema):

- **Additive** (new block type / optional field / lens) → extend the union. **No migration**;
  old rows stay valid. ~90% of changes.
- **Breaking** (rename/remove a field) → two routes, idempotency is the escape hatch:
  1. **Regenerate** — model-sourced content re-derives in the new shape by re-running enrich.
     A structure change is a *re-run, not a SQL migration*.
  2. **Migrate curated rows** — only `manual_override`/human-edited blocks need a JSON
     transform (or re-review). That set is small by design.
- `schema_version` per row lets a reader upgrade/skip stale-shaped blocks instead of crashing,
  and lets migration be lazy.

## 12. Decisions (resolved)
1. **POI storage → unified `pois` table + registry.** A new POI type is one registry variable;
   no per-type table or migration.
2. **Background jobs → a managed queue now.** Supabase Queues (pgmq) + a Bun worker on Fly,
   enqueued from admin; durable-workflow engine (Inngest/Trigger.dev) if orchestration grows.
3. **Admin stack → Next.js + Supabase Auth.** Matches `apps/web`, reuses the content renderer.

## 13. Build order (each shippable)
- **P1 — Content in the DB (the spine).** Reconcile `content_blocks` to *envelope columns +
  validated `jsonb` payload + `schema_version`*. Scope resolver (slug → numeric id), a writer
  (enrich upserts rows, persists `source_refs`, honours `manual_override`), a reader
  (`readContent` replacing `loadContent`) behind a `CONTENT_SOURCE=db|file` flag. One-time
  migration of existing `gr11/gr10.json`. *Makes "all data in the remote DB, web-queryable"
  literally true; lowest risk.*
- **P2 — Config-driven POIs.** POI registry + unified ingest. "Add a variable" becomes true.
- **P3 — Admin portal.** Read + edit + approve over P1's data (the human gate).
- **P4 — LLM check stage.** Sourcing/confidence/on-topic gate before review.
- **P5 — Background runner.** Managed queue (Supabase Queues/pgmq) + Bun worker on Fly,
  enqueued from admin.
- **P6 — Peaks through the pipeline.** `OBJECTIVE_DEFS`, peak routes normalised + chainaged.
- **P7 — Offline packages + dynamic layer.** R2 + device SQLite; weather/booking on the live
  side of the §21.1 boundary.

Start: **P1.**
