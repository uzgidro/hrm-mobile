// Camera scanner for medical codes. Mirrors the QR-login scanner: permission handling and a
// «lock after the first read» guard (the camera reports one code many times per second, and
// every read would otherwise become a request / a toast).
//
// The parent decides what a code means. After a read the scanner stays locked until the user
// taps «Scan again» (shown together with the parent's `message`), so a wrong code never makes
// the screen flicker or repeat itself.
import React, { useCallback, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Button, Text } from '@/ui';

export function CodeScanner({
  hint,
  busy = false,
  message,
  onCode,
  onRetry,
}: {
  hint: string;
  /** A request is in flight: show a spinner over the viewfinder. */
  busy?: boolean;
  /** Why the last read was refused; shown with a «Scan again» button. */
  message?: string | null;
  /** Raw text of the first code the camera reads (after unlock). */
  onCode: (raw: string) => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const lockedRef = useRef(false);

  const handle = useCallback(
    ({ data }: { data: string }) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      onCode(data);
    },
    [onCode],
  );

  const retry = () => {
    lockedRef.current = false;
    onRetry();
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Icon name="camera" size={44} color={colors.fgMuted} />
        <Text variant="body" tone="muted" style={styles.centerText}>
          {t('medicalExam.scanner.permissionBody')}
        </Text>
        <Button label={t('medicalExam.scanner.permissionGrant')} onPress={() => void requestPermission()} />
      </View>
    );
  }

  return (
    <View style={styles.flex} testID="code-scanner">
      <CameraView
        style={styles.flex}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handle}
      />
      <View style={styles.frameWrap} pointerEvents="none">
        <View style={[styles.frame, { borderColor: colors.brand }]} />
        {busy && <ActivityIndicator style={styles.spinner} size="large" color={colors.brand} />}
      </View>
      <View style={[styles.bottom, { backgroundColor: colors.bg }]}>
        <Text variant="body" tone="muted" style={styles.centerText}>
          {hint}
        </Text>
        {!!message && (
          <>
            <Text variant="label" tone="danger" style={styles.centerText} testID="scanner-message">
              {message}
            </Text>
            <Button label={t('medicalExam.scanner.retry')} variant="soft" onPress={retry} testID="scanner-retry" />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  centerText: { textAlign: 'center' },
  frameWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 230, height: 230, borderRadius: radii.lg, borderWidth: 3 },
  spinner: { position: 'absolute' },
  bottom: { padding: 20, gap: 10 },
});
