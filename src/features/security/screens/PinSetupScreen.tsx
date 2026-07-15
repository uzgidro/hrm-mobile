// Mandatory first-run PIN creation. Two internal steps — 'enter' then
// 'confirm' — driven by local state; the shared PinPad owns the digits and the
// parent watches value length to advance. On a matching confirm it calls
// lockStore.setupPin (which flips status → 'unlocked', unmounting the overlay),
// then offers biometrics by firing the NATIVE biometric prompt directly: a
// successful scan enables biometric unlock, a cancel just skips it. No extra
// in-app question — the system sheet is the confirmation.
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PinPad } from '@/features/security/components/PinPad';
import { useLockStore } from '@/store/lockStore';
import { isBiometricAvailable, authenticateBiometric } from '@/auth/biometrics';
import { PIN_LENGTH } from '@/auth/lockPolicy';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';

type Step = 'enter' | 'confirm';

export default function PinSetupScreen() {
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const setupPin = useLockStore((s) => s.setupPin);
  const setBiometricsEnabled = useLockStore((s) => s.setBiometricsEnabled);

  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Offer biometrics by firing the native OS biometric prompt directly — the
  // platform-recommended flow (Apple HIG / Android BiometricPrompt): a
  // successful scan IS the consent, so no custom "enable biometrics?" dialog
  // precedes it. Runs BEFORE setupPin() so the prompt fires while this screen is
  // still mounted and the activity is settled — firing it during the unmount
  // that setupPin() triggers (status → 'unlocked') races the OS prompt and can
  // return a spurious user_cancel on some devices.
  const offerBiometrics = async () => {
    if (!(await isBiometricAvailable())) return;
    if (await authenticateBiometric()) {
      await setBiometricsEnabled(true);
    }
  };

  // The PinPad is controlled; the parent watches the value length and acts once
  // it reaches PIN_LENGTH (submit on the completing key press).
  const complete = (pin: string) => {
    if (step === 'enter') {
      setFirstPin(pin);
      setValue('');
      setError(null);
      setStep('confirm');
      return;
    }

    // step === 'confirm'
    if (pin === firstPin) {
      setValue('');
      setBusy(true);
      void (async () => {
        // Prompt for biometrics first (screen still mounted), then persist the
        // PIN — setupPin flips status → 'unlocked' and unmounts this screen.
        await offerBiometrics();
        await setupPin(pin);
      })();
    } else {
      setError(t('security.mismatch'));
      setFirstPin('');
      setValue('');
      setStep('enter');
    }
  };

  const onChange = (next: string) => {
    if (busy) return;
    if (error) setError(null);
    setValue(next);
    if (next.length === PIN_LENGTH) complete(next);
  };

  const title = step === 'enter' ? t('security.setupTitle') : t('security.setupConfirmTitle');
  const subtitle =
    step === 'enter'
      ? t('security.setupSubtitle')
      : t('security.setupConfirmSubtitle');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.brand}>
        <View style={styles.brandCircle}>
          <Icon name="lock" size={34} color={colors.primary} />
        </View>
      </View>
      <View style={styles.padWrap}>
        <PinPad
          value={value}
          onChange={onChange}
          title={title}
          subtitle={subtitle}
          error={error}
          disabled={busy}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    brand: { alignItems: 'center', paddingTop: 32 },
    brandCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    padWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  });
