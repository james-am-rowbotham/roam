// Content-generation stage (§21 Enrich) — the repeatable engine: per section, research
// the web and compose sourced Section-Overview guide topics. This is the productionised
// version of the research→compose→verify loop. Anthropic's web_search runs server-side,
// so one call both researches and writes; we parse the structured topics out.
//
// Sourcing is mandatory (§21.10): every topic carries the URLs the model actually used.
// Idempotent + override-safe is enforced by the runner (skip already-generated scopes).

import type Anthropic from '@anthropic-ai/sdk';
import type { GuideTopic } from '@roam/content';
import type { SectionSpec } from './specs';

export const CONTENT_MODEL = process.env.CONTENT_MODEL ?? 'claude-sonnet-4-6';

const SYSTEM =
  'You are a trail-guide writer for Roam, an offline hiking app. Voice: grounded and ' +
  'specific (real place names, not categories), comparatives over superlatives, present ' +
  'tense, no marketing adjectives. You write for a hiker about to walk the stretch.';

function composePrompt(s: SectionSpec): string {
  return `Write the Section-Overview content for the "${s.name}" section of the GR11 (Senda Pirenaica), ${s.stages}.
Key places on this stretch: ${s.places}.

Research the web FIRST (Wikipedia/Wikivoyage, the Ordesa y Monte Perdido and Aigüestortes national parks, FEDME, reputable guidebooks and trip reports). SOURCING IS MANDATORY — a confidently-wrong fact is worse than nothing. Never invent a fact or a source; if you cannot source a specific, keep the claim general and grounded.

Write exactly FOUR topics, keys: terrain, flora, culture, weather. Each has a short heading (e.g. "Terrain", "Flora & fauna", "Culture", "Weather") and a 2–3 sentence body in Roam's voice.

Return ONLY a JSON object — no prose before or after:
{"topics":[{"key":"terrain","heading":"...","body":"...","sourceRefs":[{"url":"...","title":"..."}]}]}`;
}

interface RawTopic {
  key: string;
  heading: string;
  body: string;
  sourceRefs?: { url: string; title: string }[];
}

function extractTopics(text: string): RawTopic[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const raw = fenced?.[1] ?? text.slice(start, end + 1);
  const parsed = JSON.parse(raw) as { topics?: RawTopic[] };
  return parsed.topics ?? [];
}

export interface GeneratedSection {
  topics: GuideTopic[];
  sources: number;
}

/** Research + compose the four overview topics for one section. */
export async function generateSectionContent(
  client: Anthropic,
  s: SectionSpec,
): Promise<GeneratedSection> {
  const res = await client.messages.create({
    model: CONTENT_MODEL,
    max_tokens: 2500,
    system: SYSTEM,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
    messages: [{ role: 'user', content: composePrompt(s) }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  const raw = extractTopics(text);
  const topics: GuideTopic[] = raw.map((t) => ({
    key: t.key,
    facet: 'overview',
    heading: t.heading,
    body: t.body,
  }));
  const sources = raw.reduce((n, t) => n + (t.sourceRefs?.length ?? 0), 0);
  return { topics, sources };
}
