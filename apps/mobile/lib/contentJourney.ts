import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useJourneySetupStore } from '../store/journeySetupStore';
import { contentStore } from './contentRepo';
import { fetchTrailSections, trailSectionsQueryKey, useTrails } from './hooks';

// Bridge: start a journey from the content browse (offline, string ids) using the existing
// ONLINE setup wizard (numeric API ids). Journey setup/creation does not need to work offline
// — only the downloaded active trail does — so we resolve the API trail by ref at tap time.
//
// The content world and the API world share only ref/name as a join key (objective "gr11"
// name "GR11" ≡ trail.ref "GR11"). The API "section" is the etapa layer (carries orderIndex),
// so a content stage's `number` maps 1:1 to an API section's `orderIndex` for the segment preset.

export interface StartOptions {
  /** Content stage ids bounding a segment — preselects the section range, best-effort. */
  fromStageId?: string | null;
  toStageId?: string | null;
}

const sameRef = (a: string | null | undefined, b: string) =>
  !!a && a.toLowerCase() === b.toLowerCase();

export function useStartJourneyFromContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const init = useJourneySetupStore((s) => s.init);
  const patch = useJourneySetupStore((s) => s.patch);
  const trails = useTrails();

  // The API trail backing a content objective, matched by ref/name (or null → can't start).
  const apiTrailFor = (objectiveId: string) => {
    const objective = contentStore.objectiveSummaries.get(objectiveId);
    if (!objective) return null;
    return (
      trails.data?.data?.find(
        (t) => sameRef(t.ref, objective.name) || sameRef(t.name, objective.name),
      ) ?? null
    );
  };

  /** Whether a "Start journey" affordance should show for this objective (API trail exists). */
  const canStart = (objectiveId: string) => !!apiTrailFor(objectiveId);

  const start = async (objectiveId: string, opts: StartOptions = {}) => {
    const trail = apiTrailFor(objectiveId);
    if (!trail) return; // no API counterpart — caller hides the CTA, so this is defensive only

    init({ routeId: trail.routeId, trailId: trail.id, trailRef: trail.ref ?? trail.name });

    // Segment preset: map the content stage range → API section ids by orderIndex (= stage
    // number). Any miss falls back to a whole-trail setup — still better than the trail page.
    if (opts.fromStageId && opts.toStageId) {
      const fromNum = contentStore.stageSummaries.get(opts.fromStageId)?.number;
      const toNum = contentStore.stageSummaries.get(opts.toStageId)?.number;
      if (fromNum != null && toNum != null) {
        try {
          const res = await queryClient.fetchQuery({
            queryKey: trailSectionsQueryKey(String(trail.id)),
            queryFn: () => fetchTrailSections(String(trail.id)),
          });
          const sections = Array.isArray(res.data) ? res.data : [];
          const startSec = sections.find((s) => s.orderIndex === fromNum);
          const endSec = sections.find((s) => s.orderIndex === toNum);
          if (startSec && endSec) {
            patch({ scope: 'section', startSectionId: startSec.id, endSectionId: endSec.id });
          }
        } catch {
          // Network/lookup miss → whole-trail setup (the init above already set 'entire').
        }
      }
    }

    router.push('/journey/setup/scope');
  };

  return { start, canStart };
}
