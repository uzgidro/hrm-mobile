// Push diagnostics — "why did the notification not arrive?" answered on the
// phone itself. Four checks, each with a plain verdict: OS permission, device
// token, server registration, and a self-test send through the real fan-out.
// Born from a support call (2026-09-14: "texnik yordam yaratilsa kelmayapti")
// where nothing on the device could say which link of the chain was broken.
import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Icon, type IconName } from '@/components/Icon';
import { toast } from '@/lib/toast';
import { getApiErrorMessage } from '@/api/errors';
import { setupPushNotifications } from '@/auth/push';
import {
  getNotificationPermissionStatus,
  getRegisteredToken,
  getLastPushError,
} from '@/services/notifications';
import { fetchMyPushTokens, sendTestPush, type ServerPushTokens } from '../api/pushDiagnostics';

type Tone = 'ok' | 'bad' | 'muted';

export default function PushDiagnosticsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [permission, setPermission] = useState<string>('…');
  const [token, setToken] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [server, setServer] = useState<ServerPushTokens | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'register' | 'test' | null>(null);

  const refresh = useCallback(async () => {
    setPermission(await getNotificationPermissionStatus());
    setToken(getRegisteredToken());
    setLastError(getLastPushError());
    try {
      setServer(await fetchMyPushTokens());
      setServerError(null);
    } catch (e) {
      setServerError(getApiErrorMessage(e, t('errors.refreshFailed')));
    }
  }, [t]);

  useEffect(() => {
    // Deferred a tick so the first paint shows the '…' placeholders instead of
    // flashing a synchronous state update inside the effect.
    const id = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  const reRegister = async () => {
    setBusy('register');
    try {
      await setupPushNotifications();
      await refresh();
      toast.success(t('profile.pushReregistered'));
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy('test');
    try {
      const r = await sendTestPush();
      toast.success(t('profile.pushTestSent', { count: r.tokens }));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.actionFailed')));
    } finally {
      setBusy(null);
    }
  };

  const isWeb = Platform.OS === 'web';
  const permTone: Tone = permission === 'granted' ? 'ok' : permission === '…' ? 'muted' : 'bad';
  const tokenTone: Tone = token ? 'ok' : 'bad';
  const serverTone: Tone = server ? (server.count > 0 ? 'ok' : 'bad') : 'muted';

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title={t('profile.pushDiagnostics')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>{t('profile.pushIntro')}</Text>

        <View style={styles.card}>
          <Row
            icon="bell"
            tone={permTone}
            label={t('profile.pushPermission')}
            value={permission === '…' ? '…' : t(`profile.pushPerm_${permission}`, { defaultValue: permission })}
            styles={styles} colors={colors}
          />
          {permTone === 'bad' && !isWeb && (
            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openSettings()} hitSlop={8}>
              <Text style={styles.linkText}>{t('profile.pushOpenSettings')}</Text>
            </TouchableOpacity>
          )}
          <Row
            icon="idcard"
            tone={tokenTone}
            label={t('profile.pushDeviceToken')}
            value={token ? `…${token.slice(-8)}` : (lastError ?? t('profile.pushNoToken'))}
            styles={styles} colors={colors}
          />
          <Row
            icon="check"
            tone={serverTone}
            label={t('profile.pushServer')}
            value={
              server
                ? t('profile.pushServerCount', { count: server.count })
                : (serverError ?? '…')
            }
            styles={styles} colors={colors}
          />
          {server && server.tokens.length > 0 && (
            <Text style={styles.devices}>
              {server.tokens.map((d) => `${d.platform ?? '?'} …${d.token_tail ?? ''}`).join('  ·  ')}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.btn, busy != null && styles.btnDisabled]}
          onPress={reRegister}
          disabled={busy != null}
          activeOpacity={0.8}
          testID="push-reregister"
        >
          <Text style={styles.btnText}>{busy === 'register' ? '…' : t('profile.pushReregister')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, busy != null && styles.btnDisabled]}
          onPress={test}
          disabled={busy != null}
          activeOpacity={0.8}
          testID="push-test"
        >
          <Text style={styles.btnPrimaryText}>{busy === 'test' ? '…' : t('profile.pushSendTest')}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>{t('profile.pushTestHint')}</Text>
      </ScrollView>
    </Screen>
  );
}

function Row({ icon, tone, label, value, styles, colors }: {
  icon: IconName; tone: Tone; label: string; value: string;
  styles: ReturnType<typeof makeStyles>; colors: ThemeColors;
}) {
  const color = tone === 'ok' ? colors.present : tone === 'bad' ? colors.error : colors.textMuted;
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { borderColor: color }]}><Icon name={icon} size={16} color={color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, { color }]} numberOfLines={3}>{value}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    intro: { fontSize: 13, color: c.textSecondary, lineHeight: 19, marginBottom: 12 },
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.cardBorder, gap: 14, marginBottom: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowIcon: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 12, color: c.textMuted, fontWeight: '600' },
    rowValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
    devices: { fontSize: 12, color: c.textMuted },
    linkBtn: { alignSelf: 'flex-start', marginLeft: 46, marginTop: -6 },
    linkText: { fontSize: 13, fontWeight: '700', color: c.primary },
    btn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, marginBottom: 10 },
    btnPrimary: { backgroundColor: c.primary, borderColor: c.primary },
    btnDisabled: { opacity: 0.6 },
    btnText: { fontSize: 14, fontWeight: '700', color: c.text },
    btnPrimaryText: { fontSize: 14, fontWeight: '700', color: c.onPrimary },
    hint: { fontSize: 12, color: c.textMuted, textAlign: 'center', lineHeight: 18 },
  });
