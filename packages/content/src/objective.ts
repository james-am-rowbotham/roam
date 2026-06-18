// Objective shape guard — invariant 2 (Implementation Pass §3) made enforceable.
// Section/Stage decompose a trail; Route/Leg decompose a peak. A peak never carries
// a (synthetic) Section to make the tree uniform; a trail never carries Routes.
// The importer (Phase 2) runs this so malformed packs fail loudly, not silently.

import type { Objective } from './types';

/** Throws if an objective violates the trail|peak decomposition split (invariant 2):
 *  a trail must have `sectionIds` and no `routeIds`; a peak the reverse. */
export function assertObjectiveShape(o: Objective): void {
  if (o.type === 'trail') {
    if (!o.sectionIds) throw new Error(`trail "${o.id}" must have sectionIds`);
    if (o.routeIds)
      throw new Error(`trail "${o.id}" must not have routeIds (peaks decompose into routes)`);
  } else {
    if (!o.routeIds) throw new Error(`peak "${o.id}" must have routeIds`);
    if (o.sectionIds)
      throw new Error(`peak "${o.id}" must not have sectionIds (trails decompose into sections)`);
  }
}

/** Non-throwing variant for UI guards / filters. */
export function isValidObjectiveShape(o: Objective): boolean {
  try {
    assertObjectiveShape(o);
    return true;
  } catch {
    return false;
  }
}
