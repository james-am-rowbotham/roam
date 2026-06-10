import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radius, spacing, type } from '../../theme';
import { Icon } from '../ui';
import type { IconName } from '../ui';

interface Props {
  visible: boolean;
  dayNum: number;
  /** "Espinal → Burguete" for the current day. */
  routeLabel: string;
  pending?: boolean;
  /** Pause navigation (stop following) but stay on the map. */
  onPauseNavigation: () => void;
  onStopForToday: () => void;
  onFinishStage: () => void;
  onClose: () => void;
}

interface ActionProps {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  titleColor?: string;
  highlighted?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function Action({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  titleColor,
  highlighted,
  disabled,
  onPress,
}: ActionProps) {
  return (
    <TouchableOpacity
      style={[styles.action, highlighted && styles.actionHighlighted]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.actionText}>
        <Text style={[styles.actionTitle, titleColor ? { color: titleColor } : null]}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

// The Pause sheet for an active journey (Figma 224:1001). Pause navigation / stop
// for today / finish the day — wired to the progress mutations by the caller.
// (Ending the journey lives on the journey page CTA, not here.)
export function PauseSheet({
  visible,
  dayNum,
  routeLabel,
  pending,
  onPauseNavigation,
  onStopForToday,
  onFinishStage,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing[6] }]}>
        <View style={styles.grabber} />
        <Text style={styles.eyebrow}>DAY {dayNum}</Text>
        <Text style={styles.title}>{routeLabel}</Text>
        <Text style={styles.meta}>Take a break or wrap up the day.</Text>

        <View style={styles.actions}>
          <Action
            icon="pause"
            iconColor={colors.text.onAccent}
            iconBg={colors.accent}
            title="Pause navigation"
            subtitle="Stop following — look around, then carry on."
            highlighted
            disabled={pending}
            onPress={onPauseNavigation}
          />
          <Action
            icon="pause"
            iconColor={colors.status.warn.text}
            iconBg={colors.status.warn.bg}
            title="Stop here for today"
            subtitle="Save your spot and continue this day tomorrow."
            disabled={pending}
            onPress={onStopForToday}
          />
          <Action
            icon="check"
            iconColor={colors.status.success.text}
            iconBg={colors.status.success.bg}
            title="Finish day"
            subtitle={`Mark Day ${dayNum} complete and unlock Day ${dayNum + 1}.`}
            disabled={pending}
            onPress={onFinishStage}
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

  actions: { gap: spacing[4], paddingTop: spacing[6] },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    padding: spacing[6],
    borderRadius: radius.lg,
    backgroundColor: colors.bg.subtle,
  },
  actionHighlighted: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1, gap: 2 },
  actionTitle: { ...type.cardTitle, color: colors.text.primary },
  actionSubtitle: { ...type.meta, color: colors.text.secondary },
});
