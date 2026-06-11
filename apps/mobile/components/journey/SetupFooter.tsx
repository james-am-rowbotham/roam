import { Button } from '../ui';

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
      {onBack && <Button label="Back" variant="outline" grow onPress={onBack} />}
      <Button label={continueLabel} grow disabled={continueDisabled} onPress={onContinue} />
    </>
  );
}
