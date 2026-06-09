import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radius, spacing, type } from '../../theme';
import { Icon } from '../ui';

const TOTAL_STEPS = 5;

const STEP_NUMBERS = Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1);

function StepDots({ step }: { step: number }) {
  return (
    <View style={styles.dots}>
      {STEP_NUMBERS.map((n) => (
        <View key={n} style={[styles.dot, n === step ? styles.dotActive : styles.dotInactive]} />
      ))}
    </View>
  );
}

interface Props {
  step: number;
  onClose: () => void;
  onBack?: () => void;
  footer: ReactNode;
  children: ReactNode;
}

// Shared chrome for the Journey Setup steps: a top bar (close on step 1, back
// thereafter) with the "New journey" title and progress dots, a scrolling body,
// and a fixed footer supplied by each step.
export function SetupScaffold({ step, onClose, onBack, footer, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onBack ?? onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name={onBack ? 'arrow-left' : 'close'} size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>New journey</Text>
        <View style={styles.iconBtn} />
      </View>
      <StepDots step={step} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing[2],
  },
  iconBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text.primary },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    paddingBottom: spacing[4],
  },
  dot: { width: 6, height: 6, borderRadius: radius.full },
  dotActive: { backgroundColor: colors.text.primary },
  dotInactive: { backgroundColor: colors.border.default },

  content: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing[8] },
  footer: {
    flexDirection: 'row',
    gap: spacing[4],
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.app,
  },
});
