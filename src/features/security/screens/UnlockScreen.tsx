// Cold-start / relock unlock. Shows the signed-in user's identity, then the
// shared PinPad. Biometrics auto-fire once on mount (when enabled+supported)
// and are re-triggerable via the pad's fingerprint key. The parent watches the
// value length and submits at PIN_LENGTH; a correct PIN flips lockStore status
// → 'unlocked' (overlay unmounts). Navigation stays declarative — a forced
// logout only calls reset()+logout() and lets the auth guard redirect.
import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PinPad } from '@/features/security/components/PinPad';
import { useLockStore } from '@/store/lockStore';
import { useAuthStore } from '@/store/authStore';
import { PIN_LENGTH } from '@/auth/lockPolicy';
import { useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';

export default function UnlockScreen() {
  const styles = useThemedStyles(makeStyles);

  const unlockWithPin = useLockStore((s) => s.unlockWithPin);
  const unlockWithBiometrics = useLockStore((s) => s.unlockWithBiometrics);
  const biometricsEnabled = useLockStore((s) => s.biometricsEnabled);
  const biometricsSupported = useLockStore((s) => s.biometricsSupported);
  const employee = useAuthStore((s) => s.user?.employee);

  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const biometricsUsable = biometricsEnabled && biometricsSupported;

  // On the final failure the store only REPORTS forceLogout — the caller wipes
  // the lock footprint and logs out; the auth guard then redirects.
  const forceLogout = () => {
    Alert.alert(
      'Urinishlar soni tugadi',
      'Xavfsizlik maqsadida tizimdan chiqarildingiz. Qaytadan kiring.',
      [
        {
          text: 'OK',
          onPress: async () => {
            await useLockStore.getState().reset();
            await useAuthStore.getState().logout();
          },
        },
      ]
    );
  };

  const submit = async (pin: string) => {
    setBusy(true);
    try {
      const r = await unlockWithPin(pin);
      if (r.forceLogout) {
        forceLogout();
      } else if (!r.ok) {
        setError(`Noto'g'ri PIN kod. ${r.remaining} ta urinish qoldi.`);
      }
      // On ok the store unlocks and the overlay unmounts — nothing to do here.
    } finally {
      setBusy(false);
      setValue('');
    }
  };

  const tryBiometric = async () => {
    // Store guards on status ('locked') and reports success by flipping to
    // 'unlocked'; a false result just leaves the PIN pad in place.
    await unlockWithBiometrics();
  };

  // Auto-trigger biometrics exactly once on mount.
  const autoTried = useRef(false);
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    if (biometricsUsable) void tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The PinPad is controlled; the parent watches the value length and submits
  // once it reaches PIN_LENGTH (on the completing key press).
  const onChange = (next: string) => {
    if (error) setError(null);
    setValue(next);
    if (next.length === PIN_LENGTH) void submit(next);
  };

  const name = employee?.legal_name || 'Foydalanuvchi';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.identity}>
        {employee?.photo_path ? (
          <Image source={{ uri: employee.photo_path }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={styles.padWrap}>
        <PinPad
          value={value}
          onChange={onChange}
          title="PIN kodni kiriting"
          error={error}
          disabled={busy}
          onBiometric={biometricsUsable ? tryBiometric : undefined}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    identity: { alignItems: 'center', paddingTop: 32, gap: 12 },
    avatar: { width: 72, height: 72, borderRadius: 36 },
    avatarFallback: {
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: { fontSize: 30, fontWeight: '700', color: c.primary },
    name: { fontSize: 17, fontWeight: '700', color: c.text },
    padWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  });
