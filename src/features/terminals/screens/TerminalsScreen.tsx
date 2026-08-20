import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useQueries } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { HikDevice } from '@/types';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState, ErrorState, LoadingView } from '@/components/StateViews';
import { canMonitorTerminals } from '@/utils/roles';
import { terminalDevicesQuery, terminalSummaryQuery } from '../api/queries';

// TERMINALLAR (turniket / HikCentral) monitoringi — mobilда umuman yo'q edi:
// AKT xodimi qurilma uzilganini faqat kompyuterdan ko'rardi. Bu ekran webdagi
// "HikCentral" panelining O'QISH qismini beradi: nechta qurilma onlayn/oflayn,
// ro'yxatda qaysi biri uzilgan, IP va oxirgi onlayn vaqti.
//
// Ko'lam SERVERDA: filial AKT xodimi faqat o'z filialini oladi (mijoz filial
// parametri yubormaydi). Yozuv amallari (nom o'zgartirish, resync, backfill)
// ataylab MOBILGA CHIQARILMADI — ular xavfli va webда qoladi.
export default function TerminalsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const user = useAuthStore((s) => s.user);
  const [onlyOffline, setOnlyOffline] = useState(false);

  const [summaryQ, devicesQ] = useQueries({
    queries: [terminalSummaryQuery(), terminalDevicesQuery(onlyOffline ? false : undefined)],
  });

  if (!canMonitorTerminals(user)) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScreenHeader title={t('terminals.title')} />
        <EmptyState title={t('terminals.noAccess')} />
      </Screen>
    );
  }

  const summary = summaryQ.data;
  const devices = devicesQ.data ?? [];
  const loading = summaryQ.isLoading || devicesQ.isLoading;
  const failed = summaryQ.isError && devicesQ.isError;

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title={t('terminals.title')} subtitle={t('terminals.subtitle')} />
      {loading ? (
        <LoadingView />
      ) : failed ? (
        <ErrorState onRetry={() => { summaryQ.refetch(); devicesQ.refetch(); }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={summaryQ.isFetching || devicesQ.isFetching}
              onRefresh={() => { summaryQ.refetch(); devicesQ.refetch(); }}
              tintColor={colors.primaryLight}
            />
          }
        >
          <View style={styles.statRow}>
            <Stat label={t('terminals.online')} value={summary?.devices_online ?? 0} color={colors.success} styles={styles} />
            <Stat label={t('terminals.offline')} value={summary?.devices_offline ?? 0} color={colors.error} styles={styles} />
            <Stat label={t('terminals.total')} value={summary?.devices_total ?? 0} color={colors.text} styles={styles} />
          </View>

          {/* Xodimlarni terminalga yozish holati — "failed" bo'lsa AKT aralashadi. */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('terminals.enrollmentTitle')}</Text>
            <View style={styles.enrollRow}>
              <EnrollStat label={t('terminals.verified')} value={summary?.enrollment_verified ?? 0} color={colors.success} styles={styles} />
              <EnrollStat label={t('terminals.pending')} value={summary?.enrollment_pending ?? 0} color={colors.warning} styles={styles} />
              <EnrollStat label={t('terminals.failed')} value={summary?.enrollment_failed ?? 0} color={colors.error} styles={styles} />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.filterBtn, onlyOffline && styles.filterBtnOn]}
            onPress={() => setOnlyOffline((v) => !v)}
            activeOpacity={0.85}
            testID="terminals-filter-offline"
          >
            <Icon name="close" size={14} color={onlyOffline ? colors.onPrimary : colors.error} />
            <Text style={[styles.filterText, onlyOffline && styles.filterTextOn]}>
              {t('terminals.onlyOffline')}
            </Text>
          </TouchableOpacity>

          {devices.length === 0 ? (
            <EmptyState title={t('terminals.empty')} />
          ) : (
            <View style={styles.card}>
              {devices.map((d: HikDevice, i: number) => (
                <View key={d.id} style={[styles.device, i < devices.length - 1 && styles.deviceBorder]}>
                  <View style={[styles.dot, { backgroundColor: d.online ? colors.success : colors.error }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deviceName}>{d.effective_name || d.acs_dev_name || `#${d.id}`}</Text>
                    <Text style={styles.deviceMeta}>
                      {(d.locations ?? []).map((l) => l?.name).filter(Boolean).join(', ') || t('terminals.noLocation')}
                      {d.acs_dev_ip ? `  ·  ${d.acs_dev_ip}` : ''}
                    </Text>
                    {!d.online && !!d.last_online_at && (
                      <Text style={styles.offlineSince}>
                        {t('terminals.lastOnline', { value: dayjs(d.last_online_at).format('DD.MM.YYYY HH:mm') })}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.state, { color: d.online ? colors.success : colors.error }]}>
                    {d.online ? t('terminals.online') : t('terminals.offline')}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </Screen>
  );
}

function Stat({ label, value, color, styles }: { label: string; value: number; color: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EnrollStat({ label, value, color, styles }: { label: string; value: number; color: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.enrollItem}>
      <Text style={[styles.enrollValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
    statRow: { flexDirection: 'row', gap: 10 },
    stat: { flex: 1, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, paddingVertical: 14, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 16 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 10 },
    enrollRow: { flexDirection: 'row', gap: 10 },
    enrollItem: { flex: 1, alignItems: 'center' },
    enrollValue: { fontSize: 18, fontWeight: '700' },
    filterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card },
    filterBtnOn: { backgroundColor: c.error, borderColor: c.error },
    filterText: { fontSize: 13, fontWeight: '600', color: c.text },
    filterTextOn: { color: c.onPrimary },
    device: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
    deviceBorder: { borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    dot: { width: 10, height: 10, borderRadius: 5 },
    deviceName: { fontSize: 14, fontWeight: '600', color: c.text },
    deviceMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    offlineSince: { fontSize: 12, color: c.error, marginTop: 2 },
    state: { fontSize: 12, fontWeight: '700' },
  });
