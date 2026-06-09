import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radius, type } from '../../theme';

interface Props {
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}

// Back / Continue pair for the setup steps. Back is omitted (Continue goes
// full-width) when there's nowhere to go back to.
export function SetupFooter({
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled,
}: Props) {
  return (
    <>
      {onBack && (
        <TouchableOpacity style={[styles.btn, styles.back]} onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.btn, styles.continue, continueDisabled && styles.disabled]}
        onPress={onContinue}
        activeOpacity={0.85}
        disabled={continueDisabled}
      >
        <Text style={styles.continueLabel}>{continueLabel}</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: { backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.default },
  backLabel: { ...type.cardTitle, color: colors.text.primary },
  continue: { backgroundColor: colors.accent },
  continueLabel: { ...type.cardTitle, color: colors.text.onAccent },
  disabled: { opacity: 0.5 },
});
