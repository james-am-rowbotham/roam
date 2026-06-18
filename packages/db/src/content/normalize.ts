// Shared content normalization — the one place both generator paths (the keyed Anthropic
// runner and the workflow ingest) clean model output into @roam/content shapes, so the
// two can never drift. Keep it pure + dependency-light.

import type { GuideTopic } from '@roam/content';

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

/** Models sometimes emit HTML entities in prose ("Flora &amp; fauna"). Decode the common
 *  ones so the rendered text is clean. */
export function unescapeHtml(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|#39|apos);/g, (m) => ENTITIES[m] ?? m).trim();
}

export interface RawTopic {
  key: string;
  heading: string;
  body: string;
}

/** Coerce a raw model topic into an overview GuideTopic (clean text, fixed facet). */
export function normalizeTopic(t: RawTopic): GuideTopic {
  return {
    key: t.key,
    facet: 'overview',
    heading: unescapeHtml(t.heading),
    body: unescapeHtml(t.body),
  };
}
