import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../../theme';
import { Button, Icon, IconButton, type IconButtonSize } from '../ui';

// The active-journey control bar, shared by the map and the itinerary (Figma
// 83:430 / 410:1201). Pause is an immediate, reversible toggle: tap Pause →
// Resume, no menu. Everything else lives behind the ••• options sheet.
//
// The toggle is OPTIMISTIC — `paused` flips in the cache the moment you tap
// (useJourneyProgress), so the label switches instantly with no spinner; that's
// what makes it feel snappy despite the server round-trip. We only surface a
// state when the request actually fails (`error`) — a retry note + "Try again".
interface Props {
  paused: boolean;
  /** The last pause/resume toggle failed — show a retry note and "Try again". */
  error?: boolean;
  /** ••• button size — Large on the map, Medium on the itinerary. */
  moreSize?: IconButtonSize;
  onToggle: () => void;
  onMore: () => void;
}

export function ActiveControlBar({ paused, error, moreSize = 'lg', onToggle, onMore }: Props) {
  return (
    <View style={styles.col}>
      {error && (
        <View style={styles.note}>
          <Icon name="alert" size={14} color={colors.status.danger.text} />
          {/* The optimistic flip is rolled back on failure, so `paused` is the
              pre-tap state — a failed pause lands back on active (paused=false). */}
          <Text style={styles.noteText}>
            Couldn't {paused ? 'resume' : 'pause'}. Check your connection and try again.
          </Text>
        </View>
      )}
      <View style={styles.row}>
        <Button
          label={error ? 'Try again' : paused ? 'Resume' : 'Pause'}
          icon={paused ? 'play' : 'pause'}
          variant={paused ? 'solid' : 'outline'}
          size="lg"
          grow
          error={error}
          onPress={onToggle}
        />
        <IconButton icon="more" style="surface" size={moreSize} onPress={onMore} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: spacing[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[1],
  },
  noteText: { ...type.meta, color: colors.status.danger.text, flex: 1 },
});
