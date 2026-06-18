# Content-generation pipeline (§21 Enrich)

Generates the **AI-draft read layer** — Section-Overview topics (terrain / flora / culture /
weather) and per-stage Overview prose — and folds it into the app's content pack. The
content layer is **separate from the structural pack** (geometry, etapas, chainage) so the
two regenerate independently — idempotent + override-safe (§21.3).

```
                          ┌─ generate.ts  (keyed Anthropic runner, web_search)  ─┐
  scope specs ── research ┤                                                       ├─→ content cache ── pack:build ─→ app seed
   (sections,  +  compose └─ section-content.workflow.js  (no-key, this session) ─┘   db/content/<id>.json   (merge)
    stages)    +  verify        → ingest.ts (normalize + merge)
```

Both generator paths share one **normalize** (`normalize.ts`) and write one **cache**
(`cache.ts` → `packages/db/content/<id>.json`, committed). `buildTrailPack` injects the
cache as a `TrailContent` layer (`@roam/pipeline`) — section guides, objective facets, stage
blocks — staying pure.

## Two generator paths, same output

### A. Keyed Anthropic runner (fully automated)
The productionised stage. Needs `ANTHROPIC_API_KEY` (server-only, §15) in `packages/db/.env`
(gitignored) or the shell. Optional `CONTENT_MODEL` (default `claude-sonnet-4-6`).

```bash
bun run --filter @roam/db pack:content          # research + compose → cache (idempotent)
bun run --filter @roam/db pack:content -- --force   # re-generate even already-filled sections
```

### B. Recorded workflow (no key — driven by this session)
`workflows/section-content.workflow.js` is the **canonical recipe**: the research→compose→
verify loop, generic + args-driven (multi-trail). Run it via the Workflow tool with
`args.sections` derived from the built pack, then ingest the result:

```bash
bun run --filter @roam/db pack:content:ingest <result.json> [trailId]
```

`ingest.ts` is deterministic — normalize text, merge over existing (re-gen wins), keep
untouched scopes. No hand-editing of the cache.

## Then build the pack

```bash
bun run --filter @roam/db pack:build            # auto-loads the cache, merges, validates, writes app seed
```

## Files
| file | role |
|---|---|
| `specs.ts` | scope specs (sections) the runner iterates — later derived from the pack |
| `generate.ts` | path A — Anthropic `web_search` research + compose, one call per section |
| `workflows/section-content.workflow.js` | path B — the recorded, args-driven workflow recipe |
| `ingest.ts` | path B — workflow result → cache (normalize + merge) |
| `normalize.ts` | shared text/shape cleanup, so A and B never drift |
| `cache.ts` | read/write `packages/db/content/<id>.json` |
| `run.ts` | path A runner (`pack:content`) |

## Invariants
- **Sourcing mandatory** (§21.10) — every topic researched; verify drops unsupported claims.
- **Idempotent + override-safe** (§21.3) — re-runs refresh model content; a future
  `manual_override` flag (the merge seam in `ingest.ts` / `run.ts`) protects curated edits.
- **Pure merge** — `buildTrailPack` never fetches; content is injected, unit-testable.
- **Multi-trail** — both paths are scope-driven; a new trail is new specs/args, not new code.
