import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ContentBlockRenderer, storeResolve } from '../../../../components/content';
import { Button } from '../../../../components/ui/Button';
import { IconButton } from '../../../../components/ui/IconButton';
import { StatPills } from '../../../../components/ui/StatPills';
import { contentStore, useRoute } from '../../../../lib/contentRepo';
import { colors, layout, spacing, type } from '../../../../theme';

// Peak Route-detail screen (§6.1, Figma 173:720) — hero (PEAK · route name) + stat pills
// (distance · ascent · time · grade) + the route's ContentBlock[] (Overview → Map →
// Elevation → Water → Huts → Hazards → Gear → Gallery) + "Start this route" CTA.
// Structurally identical to a Stage: a thin wrapper over the one ContentBlockRenderer.
export default function RouteDetailScreen() {
  const { id, routeId } = useLocalSearchParams<{ id: string; routeId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: route } = useRoute(routeId);

  if (!route) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const peakName = contentStore.objectives.get(id)?.name;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {peakName && <Text style={styles.heroKicker}>{peakName.toUpperCase()}</Text>}
          <Text style={styles.heroTitle}>{route.name}</Text>
        </View>
        <View style={[styles.back, { top: insets.top + spacing[2] }]}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
        </View>

        <View style={styles.statBar}>
          <StatPills stats={route.atAGlance} />
        </View>

        <View style={styles.blocks}>
          <ContentBlockRenderer blocks={route.blocks} resolve={storeResolve} />
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + layout.ctaBarPadding }]}>
        <Button
          label="Start this route"
          variant="solid"
          size="lg"
          onPress={() => {
            /* TODO(phase): begin navigation for this route */
          }}
        />
      </View>
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
  content: { paddingBottom: layout.contentPaddingBottom + 64 },
  back: { position: 'absolute', left: layout.screenPadding, zIndex: 1 },
  hero: {
    height: 220,
    backgroundColor: colors.text.primary,
    padding: layout.screenPadding,
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  heroKicker: { ...type.label, color: colors.overlay.onImageMuted },
  heroTitle: {
    fontFamily: type.title.fontFamily,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: colors.overlay.onImage,
  },
  statBar: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  blocks: { padding: layout.screenPadding },
  cta: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.ctaBarPadding,
    backgroundColor: colors.bg.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
});
