// Which sections a journey day "owns", for labelling. Days don't align to section
// boundaries (a relaxed day is shorter than a section, a fast day spans several),
// so claiming every overlapped section double-counts boundaries. Instead a section
// belongs to the one day its midpoint falls in; a pure sub-section day falls back
// to the section it sits inside. Returns walking order (reversed when start > end).

interface ChainRange {
  startChainageM: number;
  endChainageM: number;
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
