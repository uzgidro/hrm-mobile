// Full-screen "applying an OTA update" gate. There is no native splash
// configured (no `splash` key in app.json), so without this the login screen
// would render underneath the OTA gate in useAuthBootstrap and then reload
// out from under the user. _layout mounts this above the navigator (same
// pattern as LockOverlay) and it self-selects visibility from otaGateStore's
// phase — 'idle' renders nothing, any other phase covers the screen with the
// app logo/name and a phase-appropriate message.
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOtaGateStore } from '@/store/otaGateStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';

export default function UpdatingOverlay() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const phase = useOtaGateStore((s) => s.phase);

  if (phase === 'idle') return null;

  const message = phase === 'downloading' ? t('ota.downloading') : t('ota.checking');

  return (
    <View style={[StyleSheet.absoluteFill, styles.fill, { backgroundColor: colors.bg }]}>
      <View style={styles.logoWrapper}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>HR</Text>
        </View>
        <Text style={styles.appName}>{t('auth.appName')}</Text>
      </View>
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    fill: {
      zIndex: 1000,
      elevation: 1000,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    logoWrapper: { alignItems: 'center', marginBottom: 32 },
    logoCircle: {
      width: 84,
      height: 84,
      borderRadius: 26,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    logoText: { fontSize: 30, fontWeight: '800', color: '#fff' },
    appName: { fontSize: 23, fontWeight: '800', color: c.text },
    spinner: { marginBottom: 16 },
    message: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
  });
