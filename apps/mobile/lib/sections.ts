// Which sections a journey day "owns", for labelling. Days don't align to section
// boundaries (a relaxed day is shorter than a section, a fast day spans several),
// so claiming every overlapped section double-counts boundaries. Instead a section
// belongs to the one day its midpoint falls in; a pure sub-section day falls back
// to the section it sits inside. Returns walking order (reversed when start > end).

interface ChainRange {
  startChainageM: number;
  endChainageM: number;
}

// The trail sections (etapas) a journey actually covers — those whose midpoint falls inside
// the journey's chainage span (the min→max chainage of its planned stages). A section-scoped
// journey's stages only cover that section, so the itinerary + tracker list the stages you
// chose, not the whole trail. A whole-trail journey spans everything → all sections.
export function journeySectionSpan<T extends ChainRange>(
  sections: T[],
  journeyStages: ChainRange[],
): T[] {
  if (journeyStages.length === 0) return sections;
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const s of journeyStages) {
    lo = Math.min(lo, s.startChainageM, s.endChainageM);
    hi = Math.max(hi, s.startChainageM, s.endChainageM);
  }
  return sections.filter((sec) => {
    const mid = (sec.startChainageM + sec.endChainageM) / 2;
    return mid >= lo && mid <= hi;
  });
}

export function sectionsForDay<T extends ChainRange>(
  sections: T[],
  start: number,
  end: number,
): T[] {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);

  let owned = sections.filter((s) => {
    const slo = Math.min(s.startChainageM, s.endChainageM);
    const shi = Math.max(s.startChainageM, s.endChainageM);
    const mid = (slo + shi) / 2;
    return mid >= lo && mid < hi;
  });

  if (owned.length === 0) {
    const dayMid = (lo + hi) / 2;
    const containing = sections.find((s) => {
      const slo = Math.min(s.startChainageM, s.endChainageM);
      const shi = Math.max(s.startChainageM, s.endChainageM);
      return dayMid >= slo && dayMid <= shi;
    });
    owned = containing ? [containing] : [];
  }

  const asc = [...owned].sort((a, b) => a.startChainageM - b.startChainageM);
  return start > end ? asc.reverse() : asc;
}
