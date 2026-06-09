import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radius, spacing, type } from '../../theme';
import { Icon } from '../ui';

interface SectionLike {
  id: number;
  name: string;
  orderIndex: number;
  startChainageM: number;
  endChainageM: number;
}

interface Props {
  visible: boolean;
  title: string;
  /** Pre-ordered in walking direction by the caller. */
  sections: SectionLike[];
  selectedId: number | null;
  /** Ids that can't be chosen given the other bound + direction. */
  disabledIds?: number[];
  onSelect: (id: number) => void;
  onClose: () => void;
}

function kmRange(s: SectionLike): string {
  const lo = Math.min(s.startChainageM, s.endChainageM);
  const hi = Math.max(s.startChainageM, s.endChainageM);
  return `km ${Math.round(lo / 1000)}–${Math.round(hi / 1000)}`;
}

// Bottom-sheet list for choosing a start/finish stage in the setup flow. Each row
// shows the stage's km range; impossible stages (given direction + the other
// bound) are dimmed and not selectable.
export function StagePicker({
  visible,
  title,
  sections,
  selectedId,
  disabledIds = [],
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const disabled = new Set(disabledIds);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing[4] }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {sections.map((s) => {
            const selected = s.id === selectedId;
            const isDisabled = disabled.has(s.id);
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.row, isDisabled && styles.rowDisabled]}
                onPress={() => {
                  onSelect(s.id);
                  onClose();
                }}
                activeOpacity={0.7}
                disabled={isDisabled}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>
                    {s.name}
                  </Text>
                  <Text style={styles.rowMeta}>{kmRange(s)}</Text>
                </View>
                {selected && <Icon name="check" size={18} color={colors.text.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay.dark },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing[4],
  },
  title: { ...type.sectionHeader, color: colors.text.primary },
  list: { paddingHorizontal: layout.screenPadding },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  rowDisabled: { opacity: 0.35 },
  rowText: { gap: spacing[1] },
  rowLabel: { ...type.body, color: colors.text.primary },
  rowLabelSelected: { fontFamily: type.cardTitle.fontFamily },
  rowMeta: { ...type.meta, color: colors.text.secondary },
});
