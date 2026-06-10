import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, layout, radius, spacing, type } from '../../theme';
import { Icon } from '../ui';

interface Props {
  /** When false, renders just the divider line (no controls) — for read-only lists. */
  editable?: boolean;
  /** Inset the line by the screen padding. False when already inside a padded container. */
  inset?: boolean;
  canCombine: boolean;
  /** Whether the day above the line can be split in two. */
  canSplit: boolean;
  onAddRest: () => void;
  onCombine: () => void;
  onSplit: () => void;
}

// The single divider between two itinerary days. A circular "+" straddles the
// line; tapping it folds out "Combine days" / "Split day" / "Add rest day".
// Combine merges the days either side; split divides the day above. Reused on the
// active itinerary and the setup Review.
export function ScheduleGap({
  editable = true,
  inset = true,
  canCombine,
  canSplit,
  onAddRest,
  onCombine,
  onSplit,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.gap}>
      <View style={[styles.line, !inset && styles.lineFlush]}>
        {editable && (
          <TouchableOpacity
            style={styles.btn}
            onPress={() => setOpen((o) => !o)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.8}
          >
            <Icon name={open ? 'close' : 'plus'} size={14} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {editable && open && (
        <View style={styles.options}>
          {canCombine && (
            <TouchableOpacity
              style={styles.pill}
              onPress={() => {
                setOpen(false);
                onCombine();
              }}
              activeOpacity={0.8}
            >
              <Icon name="combine" size={14} color={colors.text.primary} />
              <Text style={styles.pillLabel}>Combine days</Text>
            </TouchableOpacity>
          )}
          {canSplit && (
            <TouchableOpacity
              style={styles.pill}
              onPress={() => {
                setOpen(false);
                onSplit();
              }}
              activeOpacity={0.8}
            >
              <Icon name="swap" size={14} color={colors.text.primary} />
              <Text style={styles.pillLabel}>Split day</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.pill}
            onPress={() => {
              setOpen(false);
              onAddRest();
            }}
            activeOpacity={0.8}
          >
            <Icon name="plus" size={14} color={colors.text.primary} />
            <Text style={styles.pillLabel}>Add rest day</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Lift the gap (and its straddling "+") above adjacent day backgrounds so the
  // highlighted current day doesn't paint over the button.
  gap: { zIndex: 1 },
  // 1px divider sitting at the boundary between two days; the button straddles it.
  line: {
    height: 1,
    marginHorizontal: layout.screenPadding,
    backgroundColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineFlush: { marginHorizontal: 0 },
  btn: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Padding above the pills matches a day's vertical padding; the next day's top
  // padding supplies equal spacing below, so the rhythm stays even.
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[3],
    paddingTop: spacing[6],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  pillLabel: { ...type.meta, fontFamily: type.cardTitle.fontFamily, color: colors.text.primary },
});
