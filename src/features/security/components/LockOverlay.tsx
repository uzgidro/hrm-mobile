// The lock gate. _layout mounts this above the app; it self-selects which
// screen to show from the lock status: the mandatory PIN setup when a signed-in
// user has no PIN record yet, or the unlock pad after a cold start / re-lock.
// Rendered as a full-screen absolute-fill layer so it covers the content
// beneath it. Any other status renders nothing (the null branch is defensive —
// _layout only mounts this when it should be visible).
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLockStore } from '@/store/lockStore';
import { useTheme } from '@/theme/ThemeProvider';
import PinSetupScreen from '@/features/security/screens/PinSetupScreen';
import UnlockScreen from '@/features/security/screens/UnlockScreen';

export default function LockOverlay() {
  // Subscribe to language changes so the chosen child screen (which holds the
  // localized copy) repaints on a switch while this gate stays mounted.
  useTranslation();
  const status = useLockStore((s) => s.status);
  const { colors } = useTheme();

  if (status !== 'setup-required' && status !== 'locked') return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.fill, { backgroundColor: colors.bg }]}>
      {status === 'setup-required' ? <PinSetupScreen /> : <UnlockScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { zIndex: 1000, elevation: 1000 },
});
