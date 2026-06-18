// The content cache (§21) — generated AI-draft content, committed, read by pack:build.
// One file per trail at packages/db/content/<id>.json. Separate from the structural pack
// so the two regenerate independently (idempotent + override-safe).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TrailContent } from '@roam/pipeline';

const DIR = join(import.meta.dir, '..', '..', 'content');
const fileFor = (id: string) => join(DIR, `${id}.json`);

export function loadContent(id: string): TrailContent {
  const f = fileFor(id);
  return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as TrailContent) : {};
}

export function saveContent(id: string, content: TrailContent): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(fileFor(id), `${JSON.stringify(content, null, 2)}\n`);
}
