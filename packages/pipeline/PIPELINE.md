# The trail pipeline — OSM → app, end to end

How a trail goes from an OSM relation id to live content in the app. Built so **adding a
trail is a config + a run, not new code** (§8). Each stage is **idempotent + override-safe**:
re-running fills gaps and never clobbers curated work (§6, §21.3).

```
 ┌─ 0 Config ─┐   ┌─ 1 Ingest (OSM → Postgres) ─┐   ┌─ 2 Structural pack ─┐
 │ TrailConfig │→ │ extract · normalise · chainage │→ │ Postgres → @roam/content │→ ┐
 │ + etapas    │   │ (db:seed)                      │   │ (pack:build)             │  │
 └─────────────┘   └────────────────────────────────┘   └──────────────────────────┘  │
                                                                                        ▼
 ┌─ 3 Content (Enrich) ─┐   ┌─ 4 Images ─┐   ┌─ 5 Build / fold → app ─┐        the app
 │ section + objective   │→ │ Commons,    │→ │ validate + write         │  reads the bundled
 │ Guide (sourced)       │   │ license-gated│   │ apps/mobile/.../seed.json│      pack
 └───────────────────────┘   └─────────────┘   └──────────────────────────┘
        pack:content / ingest    pack:images          pack:build
        └──────────────────── pack:onboard <trailId> chains 3→5 ───────────────────┘
```

## Stages

| # | Stage | Code | Run | Generic? |
|---|---|---|---|---|
| 0 | **Config** — the per-trail row | `pipeline/src/config.ts` (`TrailConfig`), `pipeline/src/pack/config.ts` (`PackConfig`), `pipeline/src/pack/geography.ts` | — | ✅ add a row |
| 0d | **Curated etapas** — the official stage list | `pipeline/src/data/<trail>-etapas.ts` | etapa-extraction recipe (research→extract→verify) or hand | ⚠️ per-trail data, sourced |
| 1 | **Ingest** — Extract → Normalise → chainage → Postgres | `pipeline/src/{overpass,geometry,normalise,etapas}.ts`; runner `db/src/seed.ts` | `bun run --filter @roam/db db:seed -- <trailId>` | ⚠️ runner being parameterized |
| 2 | **Structural pack** — Postgres → typed pack | `db/src/pack/readKnowledge.ts`, `pipeline/src/pack/build.ts` | `pack:build` | ✅ |
| 3 | **Content** — section + objective Guide | `db/src/content/{generate,run,ingest}.ts`, `workflows/`, registry `trails.ts` | `pack:content <trailId>` / `pack:content:ingest` | ✅ trail-id driven |
| 4 | **Images** — license-gated heroes | `db/src/content/{images,run-images}.ts` | `pack:images <trailId>` | ✅ trail-id driven |
| 5 | **Build / fold** → app seed | `db/src/pack/build-packs.ts` | `pack:build` | ✅ |
| — | **Orchestrator** — 3→5 | `db/src/content/onboard.ts` | `pack:onboard <trailId>` | ✅ |

(Content details: `db/src/content/README.md`. Domain model: CLAUDE.md §5. GIS/chainage: §7.)

## Add a new trail — the checklist
1. **Config** — add a `TrailConfig` (`osmRelationId`, bbox, `ref`, `country`) + a `PackConfig`
   + a `db/src/content/trails.ts` registry entry (objective spec + image terms).
2. **Etapas** — produce `pipeline/src/data/<trail>-etapas.ts` via the etapa-extraction
   recipe (refined web searches over the federation/topoguide), then curate. The chainage
   scaler rescales published distances to the measured route, so a wrong total is caught.
3. **Ingest** — `db:seed <trailId>` (OSM → Postgres).
4. **Onboard** — `pack:onboard <trailId>` (content → images → build). Idempotent.
5. **Curate** (future `apps/admin`) — edits are `manual_override`-safe.

## Invariants
- **Idempotent + override-safe** — every stage skips done work; re-runs fill gaps.
- **Sourcing mandatory** (§21.10) — generated facts carry sources; verify drops the unsupported.
- **License gate** (§21.4) — no image without license/author/attribution.
- **Pure core** — `buildTrailPack` never does I/O; knowledge + content + media are injected.
- **The only obligatory human input per trail is the OSM relation id** — etapas, content,
  and images are researched/sourced; humans curate, not author.
