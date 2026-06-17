import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../../theme';
import { Button, type ButtonSize, type ButtonTone, type ButtonVariant } from './Button';
import { Icon } from './Icon';

// CtaButton wraps Button with the three states an async CTA moves through —
// idle → pending (spinner + busy label) → error (a "Try again" button under an
// inline failure note). Tapping in the error state re-runs onPress, so retry is
// just "fire the same action again"; pair it with a TanStack mutation's
// `isPending` / `isError`:
//
//   <CtaButton
//     label="Create journey"
//     pendingLabel="Creating…"
//     pending={create.isPending}
//     error={create.isError}
//     onPress={() => create.mutate()}
//   />
interface Props {
  /** Idle label. */
  label: string;
  /** Label while the action is in flight (defaults to `label`). */
  pendingLabel?: string;
  /** Label once it has failed (defaults to "Try again"). */
  errorLabel?: string;
  /** Inline note shown above the button on failure. */
  errorMessage?: string;
  pending?: boolean;
  error?: boolean;
  onPress: () => void;
  tone?: ButtonTone;
  variant?: ButtonVariant;
  size?: ButtonSize;
  grow?: boolean;
  fullWidth?: boolean;
  /** Disable independent of pending (e.g. an incomplete form). */
  disabled?: boolean;
}

export function CtaButton({
  label,
  pendingLabel,
  errorLabel = 'Try again',
  errorMessage = 'Something went wrong. Check your connection and try again.',
  pending,
  error,
  onPress,
  tone,
  variant,
  size = 'lg',
  grow,
  fullWidth,
  disabled,
}: Props) {
  // pending wins over error, so a retry-in-flight shows the busy state.
  const isError = !!error && !pending;
  const buttonLabel = pending ? (pendingLabel ?? label) : isError ? errorLabel : label;

  return (
    <View style={[styles.wrap, fullWidth && styles.fullWidth, grow && styles.grow]}>
      {isError && (
        <View style={styles.note}>
          <Icon name="alert" size={14} color={colors.status.danger.text} />
          <Text style={styles.noteText}>{errorMessage}</Text>
        </View>
      )}
      <Button
        label={buttonLabel}
        onPress={onPress}
        pending={pending}
        error={isError}
        disabled={disabled}
        tone={tone}
        variant={variant}
        size={size}
        // The wrap View carries any row-level growth (styles.grow → flex:1). The
        // inner Button just stretches to the wrap and keeps its natural height —
        // passing `grow` here would make its flex:1 collapse the *vertical* axis
        // (the wrap is a column), shrinking the button and hiding the label.
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[3] },
  fullWidth: { alignSelf: 'stretch' },
  grow: { flex: 1 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[1],
  },
  noteText: { ...type.meta, color: colors.status.danger.text, flex: 1 },
});
