// @roam/pipeline — config-driven trail ingestion (§8). The Extract→Normalise
// stages, plus the per-trail config that drives them.
//
// The content / read-layer pipeline (§21) extends this — its generation stages are
// a sibling of these, run during/after Enrich, reusing the same config, the same
// idempotent + override-safe rule, and the same curated chain as scope. See README.
export * from './config';
export * from './trails';
export * from './overpass';
export * from './pois';
export * from './geometry';
export * from './normalise';
export * from './etapas';
// Pack builder (§12) — TrailKnowledge → @roam/content packs, config-driven, multi-trail.
export * from './pack/config';
export * from './pack/geography';
export * from './pack/knowledge';
export * from './pack/content';
export * from './pack/build';
export * from './pack/peak';
