import {
  DIFFICULTIES,
  DISTANCE_BANDS,
  DURATION_BANDS,
  type FilterDimension,
  type MapFilters,
} from '@roam/core';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radius, spacing, type } from '../../theme';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';

// Map filter sheet (Figma 03b · 211:745) — the chip groups that filter the trails on the
// map. Pure presentation over @roam/core's filter dimensions; the screen owns the state.
type Option = { id: string; label: string };

interface Props {
  visible: boolean;
  filters: MapFilters;
  resultCount: number;
  /** Geography facets present in the data (country/range) — the chips that actually
   *  distinguish trails. Empty groups are hidden. */
  countries: Option[];
  regions: Option[];
  onToggle: (dim: FilterDimension, value: string) => void;
  onReset: () => void;
  onClose: () => void;
}

// Static dimension buckets (the data-independent ones).
const STATIC_GROUPS: { title: string; dim: FilterDimension; options: readonly Option[] }[] = [
  { title: 'DIFFICULTY', dim: 'difficulty', options: DIFFICULTIES },
  { title: 'DURATION', dim: 'duration', options: DURATION_BANDS },
  { title: 'DISTANCE', dim: 'distance', options: DISTANCE_BANDS },
];

export function FilterSheet({
  visible,
  filters,
  resultCount,
  countries,
  regions,
  onToggle,
  onReset,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  // Country / range first (they have real data), then the static buckets. Hide empty groups.
  const groups = [
    { title: 'COUNTRY', dim: 'countries' as FilterDimension, options: countries },
    { title: 'MOUNTAIN RANGE', dim: 'regions' as FilterDimension, options: regions },
    ...STATIC_GROUPS,
  ].filter((g) => g.options.length > 0);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing[6] }]}>
          <View style={styles.grip} />
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onReset} hitSlop={8}>
              <Text style={styles.reset}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.groups} showsVerticalScrollIndicator={false}>
            {groups.map((g) => {
              const selected = (filters[g.dim] as string[] | undefined) ?? [];
              return (
                <View key={g.dim} style={styles.group}>
                  <Text style={styles.groupLabel}>{g.title}</Text>
                  <View style={styles.chips}>
                    {g.options.map((o) => (
                      <Chip
                        key={o.id}
                        label={o.label}
                        selected={selected.includes(o.id)}
                        onPress={() => onToggle(g.dim, o.id)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <Button
            label={`Show ${resultCount} ${resultCount === 1 ? 'result' : 'results'}`}
            size="lg"
            fullWidth
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay.dark,
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing[4],
    maxHeight: '80%',
  },
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing[6],
  },
  title: { ...type.sectionHeader, color: colors.text.primary },
  reset: { ...type.bodyStrong, color: colors.text.secondary },
  groups: { gap: spacing[8], paddingBottom: spacing[8] },
  group: { gap: spacing[4] },
  groupLabel: { ...type.label, color: colors.text.secondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
});
