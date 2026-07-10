// Change-PIN flow — a self-contained 3-step wizard driven by local state:
// 'current' (verify the existing PIN) → 'new' (enter a fresh PIN) → 'confirm'
// (re-enter it). It reuses the shared, controlled <PinPad/>: this screen owns
// the entered value and submits when it reaches PIN_LENGTH. The lock store owns
// the crypto and the shared attempt/force-logout policy — verifyCurrentPin here
// shares unlock's counter, so brute-forcing the change screen still burns the
// same budget and force-logout survives cold starts.
import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PinPad } from '@/features/security/components/PinPad';
import { useLockStore } from '@/store/lockStore';
import { useAuthStore } from '@/store/authStore';
import { PIN_LENGTH } from '@/auth/lockPolicy';
import { useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { toast } from '@/lib/toast';
import { router } from 'expo-router';

type Step = 'current' | 'new' | 'confirm';

const STEP_TITLE: Record<Step, string> = {
  current: 'Joriy PIN kodni kiriting',
  new: 'Yangi PIN kod kiriting',
  confirm: 'Yangi PIN kodni tasdiqlang',
};

export default function ChangePinScreen() {
  const styles = useThemedStyles(makeStyles);
  const verifyCurrentPin = useLockStore((s) => s.verifyCurrentPin);
  const setupPin = useLockStore((s) => s.setupPin);
  const reset = useLockStore((s) => s.reset);
  const logout = useAuthStore((s) => s.logout);

  const [step, setStep] = useState<Step>('current');
  const [value, setValue] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Guards the async verify: while a submit is in flight we ignore new input so
  // a fast double-entry can't fire two verifies (and burn two attempts).
  const [busy, setBusy] = useState(false);

  const handleChange = (next: string) => {
    // Any edit clears a stale error so the dots aren't stuck red mid-retry.
    if (error) setError(null);
    setValue(next);
    if (next.length === PIN_LENGTH) {
      void submit(next);
    }
  };

  const submit = async (pin: string) => {
    if (busy) return;

    if (step === 'current') {
      setBusy(true);
      try {
        const r = await verifyCurrentPin(pin);
        if (r.forceLogout) {
          Alert.alert(
            'Urinishlar soni tugadi',
            'Xavfsizlik maqsadida tizimdan chiqarildingiz. Qaytadan kiring.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Wipe the lock footprint, then flip auth — the change-pin
                  // route sits under the authenticated guard, so it unmounts
                  // on logout (declarative nav, no router.replace here).
                  void (async () => {
                    await reset();
                    await logout();
                  })();
                },
              },
            ]
          );
          setValue('');
          return;
        }
        if (!r.ok) {
          setError(`Noto'g'ri PIN kod. ${r.remaining} ta urinish qoldi.`);
          setValue('');
          return;
        }
        // Verified — move to entering the new PIN.
        setStep('new');
        setValue('');
        setError(null);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (step === 'new') {
      setNewPin(pin);
      setStep('confirm');
      setValue('');
      return;
    }

    // step === 'confirm'
    if (pin !== newPin) {
      setError("PIN kodlar mos kelmadi. Qaytadan urinib ko'ring.");
      setStep('new');
      setNewPin('');
      setValue('');
      return;
    }
    setBusy(true);
    try {
      await setupPin(newPin);
      toast.success("PIN kod o'zgartirildi");
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="PIN kodni o'zgartirish" />
      <View style={styles.body}>
        <PinPad
          value={value}
          onChange={handleChange}
          title={STEP_TITLE[step]}
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
    body: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  });
