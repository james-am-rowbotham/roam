# Content pipeline (§8 Enrich + §21)

Generates the **AI-draft read layer** (Section-Overview topics, objective Planning/
Environment Guide facets, per-stage Overview prose) and the **editorial imagery**, then
folds them into the app's content pack. Designed to **onboard a new route idempotently** —
re-running only fills gaps, never clobbers curated work (§21.3).

```
            ┌── content ──────────────────────────────────┐
 Postgres   │  pack:content   (Anthropic web_search) ──┐   │
 knowledge  │     or workflow recipes + pack:ingest    ├──→ content cache ──┐
   │        │  pack:images    (Wikimedia Commons) ─────┘   │  db/content/<id>.json │
   │        └──────────────────────────────────────────────┘                       │
   └───────────────────────────── pack:build ──────────────────────────────────────┴──→ app seed
```

One command runs all of it, idempotently:

```bash
bun run --filter @roam/db pack:onboard          # the whole pipeline (keyed path if ANTHROPIC_API_KEY set)
```

Both generator paths share one **normalize**, one **cache** (`db/content/<id>.json`, committed),
one **merge** (`buildTrailPack` injects a `TrailContent` layer — section guides, objective
facets, stage blocks, media — staying pure).

## Stages

| Stage | Script | Needs | Idempotent on |
|---|---|---|---|
| Content (sections + objective Guide) | `pack:content` | `ANTHROPIC_API_KEY` | per section / whole objective guide |
| — no-key alternative | workflow recipe → `pack:content:ingest <result.json>` | — | same cache, merged |
| Editorial images | `pack:images` | — (Commons is open) | per media id |
| Build the app pack | `pack:build` | Postgres | always rebuilds, validates |
| **All of the above** | **`pack:onboard`** | key optional | each stage's own rule |

### Content — two paths, same cache
- **Keyed (automated):** `pack:content` — Anthropic `web_search` researches + composes
  section topics and the Planning/Environment Guide. `--force` regenerates.
- **No-key (this session):** the recorded recipes in `workflows/` run the same
  research→compose→**verify** loop via the Workflow tool; `pack:content:ingest <result.json>`
  folds the result into the cache deterministically.

### Images (§21.4)
`pack:images` sources one free-licensed hero per scope from **Wikimedia Commons**, with the
mandatory `license`/`author`/`attribution` fields (the hard license gate). Commons thumb
URLs are used directly for now; R2 caching for offline is the production step.

## Add a new route — the checklist
1. Add the trail's structural data to Postgres (the §8 OSM ingest) and a `PackConfig` entry.
2. Add its `SectionSpec[]` + objective spec to `specs.ts`, and image search terms to
   `run-images.ts` (later: derive both from the built pack).
3. `bun run --filter @roam/db pack:onboard` — generates content + images + builds the pack.
4. Review/curate in `apps/admin` (future); curated edits are `manual_override`-safe.

## Files
| file | role |
|---|---|
| `specs.ts` | section + objective specs the runner iterates |
| `generate.ts` | keyed path — Anthropic `web_search`, section + objective Guide |
| `images.ts` / `run-images.ts` | image sourcing (Commons, license-gated) |
| `workflows/*.workflow.js` | recorded no-key recipes (section-content, objective-guide) |
| `ingest.ts` | workflow result → cache (normalize + merge) |
| `normalize.ts` | shared text/shape cleanup (both paths) |
| `cache.ts` | read/write `db/content/<id>.json` |
| `run.ts` / `onboard.ts` | the content runner / the full idempotent orchestrator |

## Invariants
- **Sourcing mandatory** (§21.10) — every topic researched; verify drops unsupported claims.
- **License gate** (§21.4) — no image without `license`/`author`/`attribution`.
- **Idempotent + override-safe** (§21.3) — re-runs fill gaps; a future `manual_override`
  flag (the merge seam in `ingest.ts`/`run.ts`) protects curated edits.
- **Pure merge** — `buildTrailPack` never fetches; content + media are injected.
- **Multi-trail** — scope-driven; a new route is specs/terms + a run, not new code.
