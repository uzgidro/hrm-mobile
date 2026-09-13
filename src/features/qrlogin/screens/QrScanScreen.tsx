// QR orqali web'ga kirishni tasdiqlash ekrani (TZ 4.2.3).
//
// Foydalanuvchi kompyuterdagi kirish sahifasida chizilgan QR ni skanerlaydi,
// ilova qaysi brauzer kirmoqchi ekanini (IP va qurilma) ko'rsatadi va faqat
// shundan keyin tasdiqlash tugmasi chiqadi. Begona qurilmani bilmasdan
// tasdiqlab qo'yishning oldini oladi.
import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  parseQrPayload,
  qrApprove,
  qrReject,
  qrScan,
  type QrBrowserInfo,
  type QrPayload,
} from '../api/mutations';

type Phase = 'scanning' | 'confirm' | 'sending' | 'done';

export default function QrScanScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [payload, setPayload] = useState<QrPayload | null>(null);
  const [browser, setBrowser] = useState<QrBrowserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Kamera bitta kodni bir necha marta o'qiydi — birinchisidan keyin
  // qulflaymiz, aks holda serverga o'nlab so'rov ketardi.
  const lockedRef = useRef(false);

  const onScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (lockedRef.current) return;
      const parsed = parseQrPayload(data);
      if (!parsed) return; // begona QR — jimgina e'tiborsiz qoldiramiz
      lockedRef.current = true;
      setError(null);
      try {
        const res = await qrScan(parsed);
        setPayload(parsed);
        setBrowser(res.browser ?? null);
        setPhase('confirm');
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        setError(status === 410 ? t('qrLogin.expired') : t('qrLogin.scanError'));
        setPhase('scanning');
        lockedRef.current = false;
      }
    },
    [t],
  );

  const approve = async () => {
    if (!payload) return;
    setPhase('sending');
    try {
      await qrApprove(payload);
      setPhase('done');
      setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')), 1200);
    } catch {
      setError(t('qrLogin.approveError'));
      setPhase('confirm');
    }
  };

  const reject = async () => {
    if (!payload) return;
    try {
      await qrReject(payload);
    } catch {
      /* rad etish muvaffaqiyatsiz bo'lsa ham kanal o'zi eskiradi */
    }
    Alert.alert(t('qrLogin.rejectedTitle'), t('qrLogin.rejectedBody'));
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const rescan = () => {
    setPayload(null);
    setBrowser(null);
    setError(null);
    setPhase('scanning');
    lockedRef.current = false;
  };

  const body = () => {
    if (!permission) {
      return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primaryLight} />;
    }
    if (!permission.granted) {
      return (
        <View style={styles.center}>
          <Icon name="idcard" size={44} color={colors.textMuted} />
          <Text style={styles.hint}>{t('qrLogin.permissionBody')}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>{t('qrLogin.permissionGrant')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (phase === 'done') {
      return (
        <View style={styles.center}>
          <Icon name="check" size={48} color={colors.success} />
          <Text style={styles.doneText}>{t('qrLogin.approved')}</Text>
        </View>
      );
    }

    if (phase === 'confirm' || phase === 'sending') {
      return (
        <View style={styles.confirmWrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('qrLogin.confirmTitle')}</Text>
            <Text style={styles.cardBody}>{t('qrLogin.confirmBody')}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('qrLogin.device')}</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {browser?.user_agent || t('qrLogin.unknown')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('qrLogin.ip')}</Text>
              <Text style={styles.infoValue}>{browser?.ip || t('qrLogin.unknown')}</Text>
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.primaryBtn, phase === 'sending' && styles.btnDisabled]}
              onPress={approve}
              disabled={phase === 'sending'}
              activeOpacity={0.85}
            >
              {phase === 'sending' ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('qrLogin.approve')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={reject} activeOpacity={0.8}>
              <Text style={styles.ghostBtnText}>{t('qrLogin.reject')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.flex}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScanned}
        />
        <View style={styles.frameOverlay} pointerEvents="none">
          <View style={styles.frame} />
        </View>
        <View style={styles.bottomBar}>
          <Text style={styles.hint}>{t('qrLogin.hint')}</Text>
          {!!error && (
            <>
              <Text style={styles.error}>{error}</Text>
              <TouchableOpacity style={styles.ghostBtn} onPress={rescan} activeOpacity={0.8}>
                <Text style={styles.ghostBtnText}>{t('qrLogin.retry')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('qrLogin.title')}
        subtitle={t('qrLogin.subtitle')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />
      {body()}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    camera: { flex: 1 },
    frameOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
    frame: {
      width: 230,
      height: 230,
      borderRadius: 20,
      borderWidth: 3,
      borderColor: c.primaryLight,
      backgroundColor: 'transparent',
    },
    bottomBar: { padding: 20, gap: 10, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
    hint: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
    doneText: { fontSize: 16, fontWeight: '700', color: c.text, marginTop: 8 },

    confirmWrap: { flex: 1, padding: 16, justifyContent: 'center' },
    card: {
      backgroundColor: c.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 20,
      gap: 10,
    },
    cardTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    cardBody: { fontSize: 13, color: c.textSecondary, lineHeight: 19, marginBottom: 4 },
    infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    infoLabel: { fontSize: 13, color: c.textMuted, width: 84 },
    infoValue: { fontSize: 13, color: c.text, flex: 1 },

    primaryBtn: {
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 10,
    },
    btnDisabled: { opacity: 0.7 },
    primaryBtnText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
    ghostBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    ghostBtnText: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
    error: { fontSize: 13, color: c.error, textAlign: 'center' },
  });
