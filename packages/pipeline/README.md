# @roam/pipeline

Config-driven trail ingestion (PROJECT GUIDE **§8**). Turns an OSM route relation
+ a per-trail config into the curated trail data the app and Guide consume.

Adding the Nth trail should be a **new config entry, not new code** — the same
stages run for any trail from the fields in [`config.ts`](src/config.ts).

## The §8 stages

1. **Extract** — pull the route relation's ways + nearby POIs from Overpass into a
   staging shape, untouched. ([`overpass.ts`](src/overpass.ts))
2. **Normalise** — stitch ways into one ordered line ([`geometry.ts`](src/geometry.ts)),
   run chainage (§7), resolve the waymark from `osmc:symbol`/`network`
   ([`normalise.ts`](src/normalise.ts)). Stamp `source: osm`, `confidence: low`.
3. **Enrich** *(model-assisted, later)* — draft the fields OSM lacks + the Guide
   summaries over curated `source_urls`.
4. **Verify** *(human, `apps/admin`, later)* — curators correct drafts.
5. **Seed the living layer** *(later)* — pre-fill a few condition reports.

Defining property across all stages: **idempotent + override-safe** — re-running
Extract/Normalise as OSM improves never clobbers human/crowd work (`manual_override`).

## Status

- **Now:** the pure, testable pieces — `config`, `overpass`, `geometry`,
  `normalise` (waymark resolution). Lifted out of the GR11 seed
  ([`packages/db/src/seed.ts`](../db/src/seed.ts)), which still owns the
  DB-writing orchestration (chainage, regions, sections, POIs) and consumes these.
- **Next:** move the normalise orchestrator (chainage + the regions/sections/POI
  writes) here — this flips the dependency to `pipeline → db` (so the pipeline can
  write) and lets `db:seed` become a thin caller. Then: real GR11 etapas (replacing
  the synthetic even-split stages), and fetch-by-relation-id once the canonical
  GR11 relation is confirmed against live OSM.

## Relationship to the content pipeline (§21)

The **content / read-layer** workstream (§21 — illustrated trail guides, the Guide
corpus, the public-web SEO net) is **not a separate system**: its generation
pipeline (§21.3 Research → Compose → Curate → Illustrate → Publish) is a **sibling
of the stages above**, run during/after **Enrich**, and lives here. It reuses this
package's spine wholesale:

- the same **per-trail config** and **idempotent + override-safe** rule;
- the same **confidence/provenance** trust model (§6/§9);
- the same **curated chain** as its scope — content attaches to
  `Route → Region → Stage → POI` and inherits downward (§21.2).

So the foundations laid here (config-driven runs, override-safe upserts, the
curated chain) are what §21's `content_blocks` / `content_media` generation builds
on. Keep new stages config-driven and override-safe for that reason.
