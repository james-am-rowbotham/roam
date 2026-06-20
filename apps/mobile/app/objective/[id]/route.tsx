import type { Stat } from '@roam/content';
import { objectiveTabs } from '@roam/content';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaceRow } from '../../../components/browse/PlaceRow';
import { GradeBadge } from '../../../components/ui/GradeBadge';
import { IconButton } from '../../../components/ui/IconButton';
import { Tabs } from '../../../components/ui/Tabs';
import {
  mediaFor,
  useObjective,
  useObjectiveRoutes,
  useObjectiveSections,
} from '../../../lib/contentRepo';
import { colors, layout, spacing, type } from '../../../theme';

const stat = (stats: Stat[], key: string) => stats.find((s) => s.key === key)?.value;
const sectionMeta = (stats: Stat[]) =>
  [
    stat(stats, 'stages') != null ? `Stages ${stat(stats, 'stages')}` : null,
    stat(stats, 'distance') != null ? `${stat(stats, 'distance')} km` : null,
  ]
    .filter(Boolean)
    .join(' · ');
const routeMeta = (stats: Stat[]) =>
  [
    stat(stats, 'distance') != null ? `${stat(stats, 'distance')} km` : null,
    stat(stats, 'ascent') != null ? `+${stat(stats, 'ascent')} m` : null,
    stat(stats, 'time'),
  ]
    .filter(Boolean)
    .join(' · ');

// The Route view (§6.1) — a trail's Sections or a peak's Routes. Compact header (no
// hero) + the shared underline tabs (Guide | Route(s), Route active → tapping Guide
// goes back). Rows use PlaceRow; peak routes lead with the grade badge (Figma 310:1038).
export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: objective } = useObjective(id);
  const isPeak = objective?.type === 'peak';
  const sections = useObjectiveSections(id);
  const routes = useObjectiveRoutes(id);

  if (!objective) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const tabs = objectiveTabs(objective);
  const routeLabel = tabs[1]?.label ?? 'Route';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <IconButton icon="arrow-left" style="subtle" onPress={() => router.back()} />
        <Text style={styles.objectiveName}>{objective.name}</Text>
      </View>
      <Text style={styles.title}>{routeLabel}</Text>
      <Tabs
        tabs={tabs}
        value="route"
        onChange={(v) => {
          if (v === 'guide') router.back();
        }}
      />

      <ScrollView contentContainerStyle={styles.list}>
        {/* Peaks carry a kicker ("N ROUTES", Figma 310:1038); trails list directly (1020:2394). */}
        {isPeak && <Text style={styles.kicker}>{`${routes.data?.length ?? 0} ROUTES`}</Text>}
        {isPeak
          ? routes.data?.map((r) => (
              <PlaceRow
                key={r.id}
                title={r.name}
                meta={routeMeta(r.atAGlance)}
                description={r.tagline}
                leading={<GradeBadge grade={r.grade} />}
                onPress={() =>
                  router.push({
                    pathname: '/objective/[id]/route-detail/[routeId]',
                    params: { id, routeId: r.id },
                  })
                }
              />
            ))
          : sections.data?.map((s) => (
              <PlaceRow
                key={s.id}
                title={s.name}
                // Trail section rows put stages · km · character on one meta line (1020:2394).
                meta={`${sectionMeta(s.atAGlance)} · ${s.tagline}`}
                mediaUri={mediaFor(s.heroMediaId)?.uri}
                onPress={() =>
                  router.push({
                    pathname: '/objective/[id]/section/[sectionId]',
                    params: { id, sectionId: s.id },
                  })
                }
              />
            ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.app,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[2],
  },
  objectiveName: { ...type.bodyStrong, color: colors.text.secondary },
  title: {
    ...type.title,
    fontSize: 22,
    textAlign: 'center',
    color: colors.text.primary,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing[3],
  },
  list: { paddingHorizontal: layout.screenPadding, paddingBottom: layout.contentPaddingBottom },
  kicker: { ...type.label, color: colors.text.secondary, paddingVertical: spacing[6] },
});
