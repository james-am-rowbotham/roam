import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme';
import { Button, IconButton, type IconButtonSize } from '../ui';

// The active-journey control bar, shared by the map and the itinerary (Figma
// 83:430 / 410:1201). Pause is an immediate, reversible toggle: tap Pause →
// Resume, no menu. Everything else lives behind the ••• options sheet.
interface Props {
  paused: boolean;
  pending?: boolean;
  /** ••• button size — Large on the map, Medium on the itinerary. */
  moreSize?: IconButtonSize;
  onToggle: () => void;
  onMore: () => void;
}

export function ActiveControlBar({ paused, pending, moreSize = 'lg', onToggle, onMore }: Props) {
  return (
    <View style={styles.row}>
      <Button
        label={pending ? (paused ? 'Resuming…' : 'Pausing…') : paused ? 'Resume' : 'Pause'}
        icon={paused ? 'play' : 'pause'}
        variant={paused ? 'solid' : 'outline'}
        size="lg"
        grow
        pending={pending}
        onPress={onToggle}
      />
      <IconButton icon="more" style="surface" size={moreSize} onPress={onMore} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
});
