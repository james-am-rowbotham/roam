import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, spacing, type } from '../../theme';
import { IconButton } from '../ui/IconButton';

// Discovery landing scaffold (Implementation Pass §12.3) — every level (Continent /
// Country / Region) is hero → summary → labelled card list. Same shell, parameterised.
export function DiscoveryScaffold({
  name,
  tagline,
  summary,
  listLabel,
  children,
}: {
  name: string;
  tagline: string;
  summary: string;
  listLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{name}</Text>
        <Text style={styles.heroTagline}>{tagline}</Text>
      </View>
      <View style={[styles.back, { top: insets.top + spacing[2] }]}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
      </View>

      <View style={styles.bodyPad}>
        <Text style={styles.summary}>{summary}</Text>
        <Text style={styles.listLabel}>{listLabel}</Text>
        <View style={styles.list}>{children}</View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  content: { paddingBottom: layout.contentPaddingBottom },
  back: { position: 'absolute', left: layout.screenPadding, zIndex: 1 },
  hero: {
    height: 220,
    backgroundColor: colors.text.primary,
    padding: layout.screenPadding,
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  heroTitle: {
    fontFamily: type.title.fontFamily,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: colors.overlay.onImage,
  },
  heroTagline: { ...type.body, color: colors.overlay.onImageMuted },
  bodyPad: { paddingHorizontal: layout.screenPadding },
  summary: { ...type.bodyLarge, color: colors.text.primary, paddingVertical: spacing[8] },
  listLabel: { ...type.label, color: colors.text.secondary, paddingBottom: spacing[5] },
  list: { gap: spacing[8] },
});
