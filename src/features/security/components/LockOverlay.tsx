// The lock gate. _layout mounts this above the app; it self-selects which
// screen to show from the lock status: the mandatory PIN setup when a signed-in
// user has no PIN record yet, or the unlock pad after a cold start / re-lock.
// Rendered as a full-screen absolute-fill layer so it covers the content
// beneath it. Any other status renders nothing (the null branch is defensive —
// _layout only mounts this when it should be visible).
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Modal, View, StyleSheet, findNodeHandle } from 'react-native';
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

  const ref = useRef<View>(null);
  const visible = status === 'setup-required' || status === 'locked';

  // Move screen-reader focus into the gate when it appears, so TalkBack /
  // VoiceOver start on the PIN pad instead of wherever they were on the app.
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      const node = ref.current ? findNodeHandle(ref.current) : null;
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 300);
    return () => clearTimeout(timer);
  }, [visible, status]);

  if (!visible) return null;

  // A top-level native Modal (own window, presented last) so the gate sits
  // above any sheet / dialog window that might still be on screen. The sheets
  // also close themselves on lock (LockAwareModal); this is the second layer.
  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      // Hardware back must not dismiss the gate.
      onRequestClose={() => undefined}
    >
      <View
        ref={ref}
        testID="lock-overlay"
        accessible={false}
        accessibilityViewIsModal
        style={[StyleSheet.absoluteFill, styles.fill, { backgroundColor: colors.bg }]}
      >
        {status === 'setup-required' ? <PinSetupScreen /> : <UnlockScreen />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { zIndex: 1000, elevation: 1000 },
});
