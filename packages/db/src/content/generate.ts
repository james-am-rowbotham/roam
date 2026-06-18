// Content-generation stage (§21 Enrich) — the repeatable engine: per section, research
// the web and compose sourced Section-Overview guide topics. This is the productionised
// version of the research→compose→verify loop. Anthropic's web_search runs server-side,
// so one call both researches and writes; we parse the structured topics out.
//
// Sourcing is mandatory (§21.10): every topic carries the URLs the model actually used.
// Idempotent + override-safe is enforced by the runner (skip already-generated scopes).

import type Anthropic from '@anthropic-ai/sdk';
import type { GuideTopic } from '@roam/content';
import { normalizeTopic, unescapeHtml } from './normalize';
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

export interface GeneratedTopics {
  topics: GuideTopic[];
  sources: number;
}

// One research+compose call (web_search runs server-side) → concatenated text.
async function compose(client: Anthropic, prompt: string): Promise<string> {
  const res = await client.messages.create({
    model: CONTENT_MODEL,
    max_tokens: 2500,
    system: SYSTEM,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

/** Research + compose the four overview topics for one section. */
export async function generateSectionContent(
  client: Anthropic,
  s: SectionSpec,
): Promise<GeneratedTopics> {
  const raw = extractTopics(await compose(client, composePrompt(s)));
  return {
    topics: raw.map(normalizeTopic),
    sources: raw.reduce((n, t) => n + (t.sourceRefs?.length ?? 0), 0),
  };
}

// Objective Guide facets (Planning / Environment) and their topics — matches the design.
const OBJECTIVE_FACETS = [
  {
    facet: 'planning' as const,
    keys: 'kit, navigation, accommodation, water, safety, transport',
  },
  {
    facet: 'environment' as const,
    keys: 'flora, culture, food, history, weather',
  },
];

export interface ObjectiveSpec {
  name: string;
  summary: string;
  context?: string;
}

function objectivePrompt(spec: ObjectiveSpec, facet: string, keys: string): string {
  return `Write the "${facet}" Guide content for ${spec.name} — ${spec.summary}
${spec.context ?? ''}

Research the web FIRST (Wikipedia/Wikivoyage, federation guides, national parks, refuge sites, reputable trip reports). SOURCING IS MANDATORY — a confidently-wrong fact is worse than nothing. Never invent a fact or a source.

Write ONE topic for EACH of these keys: ${keys}. Each: a short heading and a 2–4 sentence body in Roam's voice, for a hiker planning/understanding the whole trail.

Return ONLY a JSON object — no prose before or after:
{"topics":[{"key":"kit","heading":"...","body":"...","sourceRefs":[{"url":"...","title":"..."}]}]}`;
}

/** Research + compose the Planning + Environment Guide topics for an objective. */
export async function generateObjectiveGuide(
  client: Anthropic,
  spec: ObjectiveSpec,
): Promise<GeneratedTopics> {
  const topics: GuideTopic[] = [];
  let sources = 0;
  for (const f of OBJECTIVE_FACETS) {
    const raw = extractTopics(await compose(client, objectivePrompt(spec, f.facet, f.keys)));
    for (const t of raw) {
      topics.push({
        key: t.key,
        facet: f.facet,
        heading: unescapeHtml(t.heading),
        body: unescapeHtml(t.body),
      });
    }
    sources += raw.reduce((n, t) => n + (t.sourceRefs?.length ?? 0), 0);
  }
  return { topics, sources };
}
