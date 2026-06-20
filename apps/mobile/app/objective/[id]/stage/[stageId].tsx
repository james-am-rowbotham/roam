import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ContentBlockRenderer, useStoreResolve } from '../../../../components/content';
import { HeroMedia } from '../../../../components/content/HeroMedia';
import { Button } from '../../../../components/ui/Button';
import { IconButton } from '../../../../components/ui/IconButton';
import { StatPills } from '../../../../components/ui/StatPills';
import { contentStore, mediaFor, useStage } from '../../../../lib/contentRepo';
import { colors, layout, spacing, type } from '../../../../theme';

// The stat row on a stage is distance · ascent · time · grade (§12.4) — drop descent.
const HERO_STATS = ['distance', 'ascent', 'time', 'grade'];

// Stage screen (§12.4) — hero (STAGE n · REGION + From → To) + stat pills, then the
// full ContentBlock[] rendered by the single renderer, then the "Start this stage" CTA.
// A stage is a thin wrapper over ContentBlockRenderer (§8): content lives in the blocks.
export default function StageScreen() {
  const { stageId } = useLocalSearchParams<{ id: string; stageId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resolve = useStoreResolve();
  const { data: stage } = useStage(stageId);

  if (!stage) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const section = contentStore.sections.get(stage.sectionId);
  const region = section ? contentStore.regions.get(section.regionIds[0] ?? '') : undefined;
  const kicker = `STAGE ${stage.number}${region ? ` · ${region.name.toUpperCase()}` : ''}`;
  const heroStats = stage.atAGlance.filter((s) => HERO_STATS.includes(s.key));
  // The stage's own hero if one was sourced, else fall back to the section's.
  const heroMediaId = mediaFor(stage.heroMediaId) ? stage.heroMediaId : section?.heroMediaId;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <HeroMedia mediaId={heroMediaId} />
          <Text style={styles.heroKicker}>{kicker}</Text>
          <Text style={styles.heroTitle}>{stage.name}</Text>
        </View>
        <View style={[styles.back, { top: insets.top + spacing[2] }]}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
        </View>

        <View style={styles.statBar}>
          <StatPills stats={heroStats} />
        </View>

        <View style={styles.blocks}>
          <ContentBlockRenderer blocks={stage.blocks} resolve={resolve} />
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + layout.ctaBarPadding }]}>
        <Button
          label="Start this stage"
          variant="solid"
          size="lg"
          onPress={() => {
            /* TODO(phase): begin navigation for this stage */
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
    height: 200,
    backgroundColor: colors.text.primary,
    padding: layout.screenPadding,
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  heroKicker: { ...type.label, color: colors.overlay.onImageMuted },
  heroTitle: {
    fontFamily: type.title.fontFamily,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.3,
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
