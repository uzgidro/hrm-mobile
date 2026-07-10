// Mandatory first-run PIN creation. Two internal steps — 'enter' then
// 'confirm' — driven by local state; the shared PinPad owns the digits and the
// parent watches value length to advance. On a matching confirm it calls
// lockStore.setupPin (which flips status → 'unlocked', unmounting the overlay),
// then optionally offers biometrics via an Alert.
import { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PinPad } from '@/features/security/components/PinPad';
import { useLockStore } from '@/store/lockStore';
import { isBiometricAvailable } from '@/auth/biometrics';
import { PIN_LENGTH } from '@/auth/lockPolicy';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';

type Step = 'enter' | 'confirm';

export default function PinSetupScreen() {
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
      'Biometrik kirish',
      "Ilovani barmoq izi yoki yuz orqali ochishni yoqasizmi?",
      [
        { text: 'Keyinroq', style: 'cancel' },
        { text: 'Yoqish', onPress: () => setBiometricsEnabled(true) },
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
      setError("PIN kodlar mos kelmadi. Qaytadan urinib ko'ring.");
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

  const title = step === 'enter' ? "PIN kod o'rnating" : 'PIN kodni tasdiqlang';
  const subtitle =
    step === 'enter'
      ? 'Ilovani himoyalash uchun 4 xonali PIN kod kiriting'
      : 'PIN kodni qaytadan kiriting';

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
