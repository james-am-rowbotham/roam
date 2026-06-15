import { Fragment } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatElevationM, formatKm } from '../../lib/format';
import { gradeLabel } from '../../lib/itineraryDays';
import { colors, fonts, radius, spacing, type } from '../../theme';

interface SectionItem {
  id: number;
  name: string;
  orderIndex: number;
  startChainageM: number;
  endChainageM: number;
  ascentM?: number | null;
  regionName?: string | null;
}

interface Props {
  /** The trail's curated stages (etapas), in any order. */
  sections: SectionItem[];
  onPressStage: (id: number) => void;
}

// The trail's stages grouped under region bands (the coarse "Section" layer) — the
// same visual language as the journey itinerary (mock 846:1752) but with no day
// grouping: a trail has no journey/pace, just its structure of regions → stages.
export function TrailStageList({ sections, onPressStage }: Props) {
  const ordered = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);

  // Stage-number range per region, for the band label ("STAGES 1–7").
  const range = new Map<string, { min: number; max: number }>();
  ordered.forEach((s, i) => {
    if (!s.regionName) return;
    const n = i + 1;
    const r = range.get(s.regionName);
    range.set(
      s.regionName,
      r ? { min: Math.min(r.min, n), max: Math.max(r.max, n) } : { min: n, max: n },
    );
  });

  let runningRegion: string | null = null;
  let firstBand = true;

  return (
    <View>
      {ordered.map((s, i) => {
        const number = i + 1;
        const distanceM = Math.abs((s.endChainageM ?? 0) - (s.startChainageM ?? 0));
        const ascentM = s.ascentM ?? 0;
        const region = s.regionName ?? null;
        let band: { name: string; rangeLabel: string; first: boolean } | null = null;
        if (region && region !== runningRegion) {
          const r = range.get(region);
          band = {
            name: region,
            rangeLabel: r ? `STAGES ${r.min}–${r.max}` : '',
            first: firstBand,
          };
          runningRegion = region;
          firstBand = false;
        }
        return (
          <Fragment key={s.id}>
            {band && (
              <View style={[styles.band, !band.first && styles.bandCrossing]}>
                <Text style={styles.bandName}>{band.name}</Text>
                <Text style={styles.bandRange}>{band.rangeLabel}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.row}
              onPress={() => onPressStage(s.id)}
              activeOpacity={0.7}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeNum}>{number}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>
                  Stage {number} · {s.name}
                </Text>
                <Text style={styles.meta}>
                  {[
                    formatKm(distanceM),
                    `${formatElevationM(ascentM)} ↑`,
                    gradeLabel(distanceM, ascentM),
                  ].join(' · ')}
                </Text>
              </View>
            </TouchableOpacity>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[5],
    paddingBottom: spacing[2],
  },
  bandCrossing: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    paddingTop: spacing[6],
  },
  bandName: { fontFamily: fonts.display, fontSize: 13, color: colors.text.primary },
  bandRange: { ...type.label, color: colors.text.secondary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNum: { fontFamily: fonts.monoMedium, fontSize: 12, color: colors.text.primary },
  body: { flex: 1, gap: spacing[1] },
  title: { ...type.cardTitle, color: colors.text.primary },
  meta: { ...type.dataMeta, color: colors.text.secondary },
});
