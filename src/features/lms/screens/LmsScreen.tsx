// v3 LMS integratsiyasi — web v2 `LmsPage` porti: o'quv yozuvlari olinadigan tashqi platforma.
// Bitta ekranda uchta narsa (v2 kabi): NIMAGA ulanish (forma), ulanish ISHLAYAPTIMI (tekshirish)
// va oxirgi ishga tushirishlar nima qilgani (oxirgi sinxron + tarix).
// Huquq: faqat sayt master-admini — v2 `RequireRole(isSiteMasterAdmin)` va server `_require_master`.
// ⚠️ API kalit ekranda hech qachon ko'rinmaydi: server uni qaytarmaydi, forma maydoni bo'sh
// boshlanadi va «bo'sh = o'zgarmaydi»; kiritilgan kalit faqat komponent holatida, keshda emas.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { isSiteMasterAdmin } from '@/utils/roles';
import { formatTashkentDateTime } from '@/utils/tashkentTime';
import { useBreakpoint } from '@/utils/responsive';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { FormInput } from '@/components/FormInput';
import { Icon } from '@/components/Icon';
import { Badge, Button, Card, Chip, EmptyState, ErrorState, ListRow, PageHeader, Screen, Skeleton, Text, Toggle } from '@/ui';
import { lmsLogsQuery, lmsSettingsQuery } from '../api/queries';
import { useSaveLmsSettings, useSyncLmsNow, useTestLmsConnection } from '../api/mutations';
import {
  logCounts,
  providerOptions,
  seedLmsForm,
  syncOutcome,
  syncStatusTone,
  type LmsForm,
  type LmsSettings,
} from '../utils/lms';

const MAX_WIDTH = 720;

const isForbidden = (e: unknown) => isAxiosError(e) && e.response?.status === 403;

/** Forma qayta to'ldiriladigan kalit: saqlangan qiymatlar o'zgarganda (fon yangilanishi tahrirni o'chirmaydi). */
const formKey = (s: LmsSettings) => JSON.stringify([s.provider, s.base_url, s.is_enabled, s.auto_sync, s.has_api_key]);

export default function LmsScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = isSiteMasterAdmin(user);
  const settings = useQuery(lmsSettingsQuery(allowed));
  const logs = useQuery(lmsLogsQuery(allowed && !!settings.data));
  const test = useTestLmsConnection();
  const sync = useSyncLmsNow();
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const header = <PageHeader title={t('lms.title')} subtitle={t('lms.subtitle')} />;
  const denied = !allowed || (settings.isError && !settings.data && isForbidden(settings.error));

  if (denied) {
    return (
      <Screen>
        {header}
        <Card>
          <EmptyState title={t('lms.noAccess')} message={t('lms.noAccessHint')} pose="sad" />
        </Card>
      </Screen>
    );
  }

  const runTest = async () => {
    setTestResult(null);
    try {
      const r = await test.mutateAsync();
      const message = r.message || t(r.ok ? 'lms.testOk' : 'lms.testFail');
      setTestResult({ ok: !!r.ok, message });
      if (r.ok) toast.success(t('lms.testOk'));
      else toast.error(message);
    } catch (e) {
      const message = getApiErrorMessage(e, t('lms.testFail'));
      setTestResult({ ok: false, message });
      toast.error(message);
    }
  };

  const runSync = async () => {
    const ok = await confirm({
      title: t('lms.syncNow'),
      message: t('lms.syncConfirm'),
      confirmLabel: t('lms.syncNow'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      const r = syncOutcome(await sync.mutateAsync());
      if (r.ok) toast.success(t('lms.syncDone', { created: r.created, updated: r.updated }));
      else toast.error(r.message || t('lms.syncFail'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('lms.syncFail')));
    }
  };

  const renderBody = () => {
    if (settings.isError && !settings.data) return <ErrorState onRetry={() => settings.refetch()} />;
    if (settings.isPending) return <Skeleton height={320} />;
    const s = settings.data;
    return (
      <>
        <View style={styles.actions}>
          <Button
            testID="lms-test"
            label={t('lms.testConnection')}
            icon="globe"
            variant="soft"
            size="sm"
            style={styles.actionBtn}
            loading={test.isPending}
            onPress={runTest}
          />
          <Button
            testID="lms-sync"
            label={t('lms.syncNow')}
            icon="refresh"
            variant="soft"
            size="sm"
            style={styles.actionBtn}
            loading={sync.isPending}
            onPress={runSync}
          />
        </View>
        {testResult && <TestBanner ok={testResult.ok} message={testResult.message} />}
        <LmsSettingsForm key={formKey(s)} settings={s} />
        <LastSyncCard settings={s} />
        <Card title={t('lms.history')} icon="clock" tint="grey" style={styles.card}>
          {logs.isError && !logs.data ? (
            <ErrorState onRetry={() => logs.refetch()} />
          ) : logs.isPending ? (
            <Skeleton height={120} />
          ) : !logs.data?.length ? (
            <Text variant="label" tone="subtle" style={styles.center}>
              {t('lms.noRuns')}
            </Text>
          ) : (
            logs.data.map((l) => (
              <ListRow
                key={l.id}
                testID={`lms-log-${l.id}`}
                title={l.message || '—'}
                subtitle={`${formatTashkentDateTime(l.started_at)}${l.triggered_by ? ` · ${l.triggered_by}` : ''}`}
                left={
                  <View>
                    <Badge
                      label={l.status === 'ok' ? t('lms.statusOk') : t('lms.statusFail')}
                      tone={syncStatusTone(l.status)}
                    />
                  </View>
                }
                right={
                  <Text variant="caption" tone="muted">
                    {logCounts(l)}
                  </Text>
                }
              />
            ))
          )}
        </Card>
      </>
    );
  };

  return (
    <Screen
      refreshing={settings.isRefetching}
      onRefresh={() => void Promise.all([settings.refetch(), logs.refetch()])}
      maxWidth={MAX_WIDTH}
    >
      {header}
      {renderBody()}
    </Screen>
  );
}

function TestBanner({ ok, message }: { ok: boolean; message: string }) {
  const { colors: c } = useTheme();
  return (
    <View testID="lms-test-result" style={[styles.banner, { backgroundColor: ok ? c.successSoft : c.dangerSoft }]}>
      <Icon name={ok ? 'check' : 'close'} size={16} color={ok ? c.success : c.danger} />
      <Text variant="label" tone={ok ? 'success' : 'danger'} style={styles.flex}>
        {message}
      </Text>
    </View>
  );
}

function LmsSettingsForm({ settings }: { settings: LmsSettings }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<LmsForm>(() => seedLmsForm(settings));
  const save = useSaveLmsSettings();
  const set = (p: Partial<LmsForm>) => setForm((f) => ({ ...f, ...p }));

  const submit = async () => {
    try {
      await save.mutateAsync(form);
      save.reset(); // kalit mutatsiya holatida (variables) qolmasin
      set({ apiKey: '' });
      toast.success(t('lms.saved'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('lms.saveFailed')));
    }
  };

  const toggle = (id: string, label: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={styles.switchRow}>
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
      <Toggle
        testID={id}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );

  return (
    <Card title={t('lms.settings')} icon="settings" tint="grey" style={styles.card}>
      <Text variant="label" tone="muted" style={styles.fieldLabel}>
        {t('lms.provider')}
      </Text>
      <View style={styles.chips}>
        {providerOptions(settings).map((p) => (
          <Chip
            key={p}
            testID={`lms-provider-${p}`}
            label={p}
            selected={form.provider === p}
            onPress={() => set({ provider: p })}
          />
        ))}
      </View>
      <FormInput
        testID="lms-base-url"
        label={t('lms.baseUrl')}
        value={form.baseUrl}
        onChangeText={(v) => set({ baseUrl: v })}
        placeholder="https://…"
      />
      <Text variant="caption" tone="subtle" style={styles.hint}>
        {t('lms.baseUrlHint')}
      </Text>
      <FormInput
        testID="lms-api-key"
        label={t('lms.apiKey')}
        value={form.apiKey}
        onChangeText={(v) => set({ apiKey: v })}
        placeholder={settings.has_api_key ? '••••••••' : ''}
        secureTextEntry
      />
      <Text variant="caption" tone="subtle" style={styles.hint} testID="lms-api-key-hint">
        {settings.has_api_key ? t('lms.apiKeyStored') : t('lms.apiKeyEmpty')}
      </Text>
      {toggle('lms-enabled', t('lms.enabled'), form.enabled, (v) => set({ enabled: v }))}
      {toggle('lms-auto-sync', t('lms.autoSync'), form.autoSync, (v) => set({ autoSync: v }))}
      <Text variant="caption" tone="subtle" style={styles.hint}>
        {t('lms.autoSyncHint')}
      </Text>
      <Button testID="lms-save" label={t('common.save')} size="lg" full loading={save.isPending} onPress={submit} />
    </Card>
  );
}

function LastSyncCard({ settings }: { settings: LmsSettings }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  // Telefonda 4 ustunga «O'tkazib yuborildi» sig'masdi — 2×2.
  const compact = useBreakpoint().sizeClass === 'compact';
  const stats = settings.last_sync_stats;
  const ok = settings.last_sync_status === 'ok';
  const cells = [
    ['fetched', stats?.fetched],
    ['created', stats?.created],
    ['updated', stats?.updated],
    ['skipped', stats?.skipped],
  ] as const;
  return (
    <Card title={t('lms.lastSync')} icon="refresh" tint="drop" style={styles.card}>
      {settings.last_sync_at ? (
        <View style={styles.last}>
          <View style={styles.row}>
            <Badge label={ok ? t('lms.statusOk') : t('lms.statusFail')} tone={ok ? 'success' : 'danger'} />
            <Text variant="caption" tone="muted" testID="lms-last-at">
              {formatTashkentDateTime(settings.last_sync_at)}
            </Text>
          </View>
          {!!settings.last_sync_message && (
            <Text variant="caption" tone="muted">
              {settings.last_sync_message}
            </Text>
          )}
          {!!stats && (
            <View style={styles.stats}>
              {cells.map(([k, v]) => (
                <View
                  key={k}
                  style={[styles.stat, compact && styles.statHalf, { backgroundColor: c.surface2 }]}
                  testID={`lms-stat-${k}`}
                >
                  <Text variant="heading">{String(v ?? 0)}</Text>
                  <Text variant="caption" tone="subtle" numberOfLines={1}>
                    {t(`lms.${k}`)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <Text variant="label" tone="subtle">
          {t('lms.neverSynced')}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  // Sig'sa — yonma-yon teng; sig'masa — har biri to'liq enda (chapga yopishgan yarim tugma emas).
  actionBtn: { flexGrow: 1 },
  card: { marginBottom: 12 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  flex: { flex: 1 },
  fieldLabel: { marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  hint: { marginTop: -8, marginBottom: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  last: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  stat: { flex: 1, alignItems: 'center', borderRadius: radii.sm, paddingVertical: 8, paddingHorizontal: 4 },
  statHalf: { flexBasis: '45%', flexGrow: 1 },
  center: { textAlign: 'center', paddingVertical: 16 },
});
