import type { ContentBlock } from './blocks';
import type { GuideTopic } from './types';

// The current content-shape version (§21.8). Bump on a BREAKING change to the
// ContentBlock / GuideTopic union; a reader uses it to upgrade or skip stale-shaped
// rows instead of crashing. Additive changes don't bump it.
export const CONTENT_SCHEMA_VERSION = 1;

// One stored content unit — the validated `block` jsonb payload of a content_blocks row.
// A discriminated union so the DB stays shape-agnostic: the renderable structure is owned
// HERE (one source of truth), never by DB columns (§21.8). The reader reassembles a
// TrailContent from rows keyed by (scopeType, scopeId, unit). New units/blocks are an
// additive edit here — no DB migration.
export type StoredContent =
  | { unit: 'guideTopic'; topic: GuideTopic }
  | { unit: 'stageBlock'; block: ContentBlock }
  | { unit: 'highlight'; title: string; body: string }
  | { unit: 'hazard'; tone: string; body: string };

export type StoredContentUnit = StoredContent['unit'];
