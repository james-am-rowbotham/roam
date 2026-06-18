// Editorial image sourcing (§21.4) — Wikimedia Commons, license-gated. For a search
// term, return the first free-licensed photo as a MediaAsset (uri + size + the mandatory
// license/attribution fields). License is a HARD gate: anything not clearly CC/PD/free is
// skipped. Commons thumb URLs are stable + hotlinkable as long as we show attribution.
//
// This is the v1 sourcing pass: query → license filter → first good still. The §21.4
// vision/quality pass + R2 caching come later; the schema is already attribution-ready.

import type { MediaAsset } from '@roam/content';

const UA = 'RoamHikeApp/0.1 (studio.sqr.head@gmail.com)';
const FREE = /(CC BY|CC0|CC-BY|public domain|no restrictions)/i;
const SKIP = /\.(svg|pdf|webm|ogv|gif|xcf)$/i; // diagrams/video/etc — not hero stills

const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export interface ImageQuery {
  mediaId: string;
  term: string;
}

interface CommonsPage {
  index?: number;
  title?: string;
  imageinfo?: {
    thumburl?: string;
    thumbwidth?: number;
    thumbheight?: number;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
}

export async function sourceImage(q: ImageQuery): Promise<MediaAsset | null> {
  const base = 'https://commons.wikimedia.org/w/api.php';
  const params =
    'action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize&iiurlwidth=1600';
  const url = `${base}?${params}&gsrsearch=${encodeURIComponent(q.term)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const data = (await res.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  const pages = Object.values(data.query?.pages ?? {});
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)); // keep search relevance order

  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii?.thumburl || SKIP.test(p.title ?? '')) continue;
    const em = ii.extmetadata ?? {};
    const license = strip(em.LicenseShortName?.value ?? '');
    if (!FREE.test(license)) continue;
    const author = strip(em.Artist?.value ?? '') || 'Unknown';
    return {
      id: q.mediaId,
      uri: ii.thumburl,
      width: ii.thumbwidth ?? 1600,
      height: ii.thumbheight ?? 1067,
      license,
      author,
      attribution: `${author} · ${license} · Wikimedia Commons`,
      sourceUrl: ii.descriptionurl ?? '',
    };
  }
  return null;
}
