// Mandatory first-run PIN creation. Two internal steps — 'enter' then
// 'confirm' — driven by local state; the shared PinPad owns the digits and the
// parent watches value length to advance. On a matching confirm it calls
// lockStore.setupPin (which flips status → 'unlocked', unmounting the overlay),
// then optionally offers biometrics via an Alert.
import { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PinPad } from '@/features/security/components/PinPad';
import { useLockStore } from '@/store/lockStore';
import { isBiometricAvailable } from '@/auth/biometrics';
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

  // Offer biometrics right after setupPin resolves. setupPin has already
  // flipped status → 'unlocked', so the overlay will unmount on the next
  // _layout render — but the Alert is fired from this same async tick, so it
  // still surfaces (and setBiometricsEnabled persists regardless of unmount).
  const offerBiometrics = async () => {
    if (!(await isBiometricAvailable())) return;
    Alert.alert(
      t('security.biometricTitle'),
      t('security.biometricMessage'),
      [
        { text: t('security.biometricLater'), style: 'cancel' },
        { text: t('security.biometricEnable'), onPress: () => setBiometricsEnabled(true) },
      ]
    );
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
        await setupPin(pin);
        await offerBiometrics();
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
