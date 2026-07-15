import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, StyleSheet, Image, Alert,
  TouchableOpacity, Linking, Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ScreenHeader, HeaderAction } from '@/components/ScreenHeader';
import { Icon, IconName } from '@/components/Icon';
import { LoadingView } from '@/components/StateViews';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { visitorDetailQuery } from '../api/queries';
import { useDeleteVisitor } from '../api/mutations';

function Row({ icon, label, value, styles, colors }: {
  icon: IconName; label: string; value?: string | null; styles: any; colors: ThemeColors;
}) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}><Icon name={icon} size={18} color={colors.textSecondary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function MehmonDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitorId = Number(id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: v, isLoading } = useQuery(visitorDetailQuery(visitorId));

  const del = useDeleteVisitor();

  const active = v?.is_active !== false;

  const onDelete = async () => {
    const ok = await confirm({
      title: t('visitors.deleteTitle'),
      message: t('visitors.deleteConfirm'),
      confirmLabel: t('visitors.deleteConfirmAction'),
      cancelLabel: t('common.cancel'),
      icon: 'trash',
      destructive: true,
    });
    if (!ok) return;
    del.mutate(visitorId, {
      onSuccess: () => router.back(),
      onError: (e) => Alert.alert(t('visitors.errorTitle'), getApiErrorMessage(e, t('visitors.deleteError'))),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title={t('visitors.detailTitle')}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <HeaderAction icon="edit" onPress={() => router.push({ pathname: '/mehmon-form', params: { id: String(visitorId) } })} />
            <HeaderAction icon="trash" onPress={onDelete} color={colors.error} />
          </View>
        }
      />
      {isLoading || !v ? (
        <LoadingView />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            {v.photo_path ? (
              <Image source={{ uri: v.photo_path }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <Text style={styles.photoInitial}>{(v.legal_name || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.name}>{v.legal_name || t('visitors.nameFallback')}</Text>
            {!!(v.organization_name || v.job_position) && (
              <Text style={styles.sub}>{[v.organization_name, v.job_position].filter(Boolean).join(' · ')}</Text>
            )}
            <View style={[styles.badge, { backgroundColor: active ? colors.successSoft : colors.errorSoft }]}>
              <Text style={[styles.badgeText, { color: active ? colors.success : colors.error }]}>
                {active ? t('visitors.permitActive') : t('visitors.statusInactive')}
              </Text>
            </View>
          </View>

          {!!v.qr_path && (
            <View style={styles.qrCard}>
              <Image source={{ uri: v.qr_path }} style={styles.qr} resizeMode="contain" />
              {!!v.card_no && <Text style={styles.cardNo}>{t('visitors.cardNo', { value: v.card_no })}</Text>}
              <View style={styles.qrActions}>
                <TouchableOpacity style={styles.qrBtn} activeOpacity={0.85} onPress={() => Linking.openURL(v.qr_path!)}>
                  <Icon name="arrowDown" size={17} color={colors.primary} />
                  <Text style={styles.qrBtnText}>{t('visitors.qrDownload')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.qrBtn}
                  activeOpacity={0.85}
                  onPress={() => Share.share({ message: `${t('visitors.qrShareMessage', { name: v.legal_name || t('visitors.nameFallback') })}\n${v.qr_path}`, url: v.qr_path! })}
                >
                  <Icon name="mail" size={17} color={colors.primary} />
                  <Text style={styles.qrBtnText}>{t('visitors.qrShare')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Row icon="phone" label={t('visitors.fieldPhone')} value={v.phone_number} styles={styles} colors={colors} />
            <Row icon="mail" label={t('visitors.fieldTelegram')} value={v.telegram_username ? `@${v.telegram_username.replace(/^@/, '')}` : ''} styles={styles} colors={colors} />
            <Row icon="idcard" label={t('visitors.fieldPin')} value={v.personal_identification_number} styles={styles} colors={colors} />
          </View>

          <Text style={styles.sectionLabel}>{t('visitors.hostSection')}</Text>
          <View style={styles.card}>
            <Row icon="user" label={t('visitors.fieldHost')} value={v.host_employee_name} styles={styles} colors={colors} />
            <Row icon="phone" label={t('visitors.fieldHostPhone')} value={v.host_employee_internal_phone} styles={styles} colors={colors} />
            <Row icon="building" label={t('visitors.fieldBranch')} value={v.organization_branch?.name} styles={styles} colors={colors} />
          </View>

          <Text style={styles.sectionLabel}>{t('visitors.permitSection')}</Text>
          <View style={styles.card}>
            <Row icon="calendar" label={t('visitors.fieldValidFrom')} value={v.valid_from ? dayjs(v.valid_from).format('DD.MM.YYYY HH:mm') : ''} styles={styles} colors={colors} />
            <Row icon="calendar" label={t('visitors.fieldValidUntil')} value={v.valid_until ? dayjs(v.valid_until).format('DD.MM.YYYY HH:mm') : ''} styles={styles} colors={colors} />
            <Row icon="clock" label={t('visitors.fieldLastVisit')} value={v.last_visit_time ? dayjs(v.last_visit_time).format('DD.MM.YYYY HH:mm') : ''} styles={styles} colors={colors} />
            <Row icon="checklist" label={t('visitors.fieldVisitCount')} value={v.visit_count != null ? String(v.visit_count) : ''} styles={styles} colors={colors} />
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingBottom: 24 },

    hero: { alignItems: 'center', paddingVertical: 8, marginBottom: 12 },
    photo: { width: 96, height: 96, borderRadius: 48, backgroundColor: c.skeleton },
    photoFallback: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    photoInitial: { fontSize: 38, fontWeight: '800', color: c.primary },
    name: { fontSize: 20, fontWeight: '800', color: c.text, marginTop: 12, textAlign: 'center' },
    sub: { fontSize: 13, color: c.textSecondary, marginTop: 4, textAlign: 'center' },
    badge: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },

    qrCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 16, alignItems: 'center', marginBottom: 12, gap: 10 },
    qr: { width: 180, height: 180, backgroundColor: '#fff', borderRadius: 8 },
    cardNo: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    qrActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 4 },
    qrBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 12, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primary },
    qrBtnText: { fontSize: 14, fontWeight: '700', color: c.primary },

    sectionLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 },
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder },
    rowIcon: { width: 26, alignItems: 'center' },
    rowLabel: { fontSize: 11, color: c.textMuted },
    rowValue: { fontSize: 14, color: c.text, fontWeight: '600', marginTop: 1 },
  });
