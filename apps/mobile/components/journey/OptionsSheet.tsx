import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radius, spacing, type } from '../../theme';
import { Icon } from '../ui';
import type { IconName } from '../ui';

// The active-journey ••• options sheet (Figma 511:1344 / 481:1257). One sheet,
// shared between the map and the itinerary — only the top navigation row differs
// (Itinerary on the map, Map on the itinerary). Pause/Resume is NOT here; it's an
// immediate toggle on the control bar.
interface Props {
  visible: boolean;
  /** Where the sheet is opened from — flips the navigation row. */
  context: 'map' | 'itinerary';
  /** Journey name, e.g. "GR11 2027". */
  journeyName: string;
  /** Progress line, e.g. "Day 11 of 40 · 228 of 820 km walked". */
  progressLabel: string;
  /** Subtitle for Finish stage, e.g. "Mark Day 3 complete and unlock Day 4." */
  finishStageSubtitle: string;
  pending?: boolean;
  /** Itinerary (from map) or Map (from itinerary). */
  onNavigate: () => void;
  onAskGuide: () => void;
  onFinishStage: () => void;
  onFinishJourney: () => void;
  onClose: () => void;
}

interface RowProps {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  titleColor?: string;
  disabled?: boolean;
  onPress: () => void;
}

function Row({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  titleColor,
  disabled,
  onPress,
}: RowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={disabled} activeOpacity={0.8}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, titleColor ? { color: titleColor } : null]}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function OptionsSheet({
  visible,
  context,
  journeyName,
  progressLabel,
  finishStageSubtitle,
  pending,
  onNavigate,
  onAskGuide,
  onFinishStage,
  onFinishJourney,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const onMap = context === 'map';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing[6] }]}>
        <View style={styles.grabber} />
        <Text style={styles.eyebrow}>OPTIONS</Text>
        <Text style={styles.title}>{journeyName}</Text>
        <Text style={styles.meta}>{progressLabel}</Text>

        <View style={styles.rows}>
          <Row
            icon={onMap ? 'route' : 'map'}
            iconColor={colors.text.secondary}
            iconBg={colors.bg.subtle}
            title={onMap ? 'Itinerary' : 'Map'}
            subtitle={onMap ? 'View all stages and your progress.' : 'Back to the live map.'}
            onPress={onNavigate}
          />
          <Row
            icon="robot"
            iconColor={colors.status.progress.text}
            iconBg={colors.status.progress.bg}
            title="Ask guide"
            subtitle="Ask the trail guide a question."
            onPress={onAskGuide}
          />
          <Row
            icon="check"
            iconColor={colors.status.success.text}
            iconBg={colors.status.success.bg}
            title="Finish stage"
            subtitle={finishStageSubtitle}
            disabled={pending}
            onPress={onFinishStage}
          />
          <Row
            icon="flag"
            iconColor={colors.status.danger.text}
            iconBg={colors.status.danger.bg}
            title="Finish journey"
            titleColor={colors.status.danger.text}
            subtitle={`End ${journeyName} and log the whole journey as complete.`}
            disabled={pending}
            onPress={onFinishJourney}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay.dark },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing[4],
    paddingHorizontal: layout.screenPadding,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    marginBottom: spacing[6],
  },
  eyebrow: { ...type.label, color: colors.text.secondary },
  title: { ...type.sectionHeader, color: colors.text.primary, paddingTop: spacing[1] },
  meta: { ...type.meta, color: colors.text.secondary, paddingTop: spacing[1] },

  rows: { gap: spacing[4], paddingTop: spacing[6] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    padding: spacing[6],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...type.cardTitle, color: colors.text.primary },
  rowSubtitle: { ...type.meta, color: colors.text.secondary },
});
