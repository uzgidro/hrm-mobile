// v3 Tizim holati — web v2 `SystemHealthPage` + `SystemOpsPanel` porti (TZ E2/E3): tizim o'zini
// tekshiradi (komponentlar, hodisalar, ish rejimi) va operator konsoli uni to'xtatadi/tiklaydi.
// Huquq: faqat sayt master-admini — v2 `RequireRole(isSiteMasterAdmin)` va server
// `_require_master_admin` bilan bir xil; boshqa foydalanuvchida so'rovlar umuman ketmaydi.
// Avariya/tiklash rejimida ham `system/ops/*` va master-admin so'rovlari ochiq (server darvozasi),
// shuning uchun bu ekrandan tizimni ish rejimiga qaytarish mumkin.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { isSiteMasterAdmin } from '@/utils/roles';
import { useBreakpoint } from '@/utils/responsive';
import { formatTashkentDateTime } from '@/utils/tashkentTime';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  PageHeader,
  Screen,
  Skeleton,
  StatTile,
  Text,
} from '@/ui';
import { diagnosticsQuery, incidentsQuery, opsStateQuery } from '../api/queries';
import { useEnterRecovery, useResumeSystem } from '../api/mutations';
import { OpsReportSheet, RecoverySheet, ShutdownSheet } from '../components/OpsSheets';
import {
  OPS_MODES,
  INCIDENT_KINDS,
  checkTone,
  incidentMinutes,
  incidentResolved,
  opsActions,
  overallStatus,
  recoveryHasProblems,
  systemReasonKey,
  type OpsAction,
} from '../utils/sysHealth';

const LIST_MAX_WIDTH = 960;

type Report = { title: string; data: unknown; n: number };

export default function SystemHealthScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const allowed = isSiteMasterAdmin(user);
  const { sizeClass } = useBreakpoint();
  const compact = sizeClass === 'compact';

  const state = useQuery(opsStateQuery(allowed));
  const diag = useQuery(diagnosticsQuery(allowed));
  const incidents = useQuery(incidentsQuery(allowed));
  const enter = useEnterRecovery();
  const resume = useResumeSystem();
  const [sheet, setSheet] = useState<null | { kind: 'shutdown' | 'run'; n: number }>(null);
  const [report, setReport] = useState<Report | null>(null);
  // Spinner faqat tortib yangilashda: `diag.isRefetching` har 120 s lik avtomatik so'rovda ham yonardi.
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([state.refetch(), diag.refetch(), incidents.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const header = <PageHeader title={t('sysHealth.title')} subtitle={t('sysHealth.subtitle')} />;

  if (!allowed) {
    return (
      <Screen>
        {header}
        <Card>
          <EmptyState title={t('sysHealth.noAccess')} message={t('sysHealth.noAccessHint')} pose="sad" />
        </Card>
      </Screen>
    );
  }

  const checks = diag.data?.checks ?? [];
  // Fon yangilanishi yiqilsa — oxirgi ma'lum natija qoladi; «bilmayman» faqat ma'lumot yo'q bo'lsa.
  const overall = overallStatus(diag.isError && !diag.data, diag.data);
  const mode = state.data?.mode || 'running';
  const modeLabel = state.data
    ? (OPS_MODES as readonly string[]).includes(mode)
      ? t(`sysHealth.mode_${mode}`)
      : state.data.mode_label || mode
    : state.isError
      ? '—'
      : '…';
  const busy = enter.isPending || resume.isPending;

  const simpleAction = async (kind: 'enter' | 'resume') => {
    const enterKind = kind === 'enter';
    const ok = await confirm({
      title: t(enterKind ? 'sysHealth.recoveryEnter' : 'sysHealth.resume'),
      message: t(enterKind ? 'sysHealth.recoveryEnterWarn' : 'sysHealth.resumeWarn'),
      confirmLabel: t(enterKind ? 'sysHealth.recoveryEnter' : 'sysHealth.resumeConfirm'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      await (enterKind ? enter : resume).mutateAsync();
      toast.success(t(enterKind ? 'sysHealth.recoveryEnterDone' : 'sysHealth.resumeDone'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('sysHealth.actionFailed')));
    }
  };

  const actionButton = (a: OpsAction) => {
    const spec = {
      shutdown: { label: 'sysHealth.shutdown', icon: 'lock', variant: 'danger' },
      enter: { label: 'sysHealth.recoveryEnter', icon: 'help', variant: 'soft' },
      run: { label: 'sysHealth.recoveryRun', icon: 'refresh', variant: 'primary' },
      resume: { label: 'sysHealth.resume', icon: 'check', variant: 'soft' },
    } as const;
    const s = spec[a];
    return (
      <Button
        key={a}
        testID={`sys-action-${a}`}
        label={t(s.label)}
        icon={s.icon}
        variant={s.variant}
        size="sm"
        disabled={busy}
        loading={(a === 'enter' && enter.isPending) || (a === 'resume' && resume.isPending)}
        onPress={() =>
          a === 'enter' || a === 'resume'
            ? void simpleAction(a)
            : setSheet({ kind: a === 'shutdown' ? 'shutdown' : 'run', n: Date.now() })
        }
      />
    );
  };

  const basis = compact ? '100%' : '30%';
  const tiles = [
    {
      id: 'overall',
      label: t('sysHealth.overall'),
      // «Yuklab bo'lmadi» katta raqam shriftida telefonda kesilardi — plitkada «—», izoh ostida.
      value: overall === 'failed' ? '—' : t(`sysHealth.overall_${overall}`),
      sub: overall === 'failed' ? t('sysHealth.overall_failed') : undefined,
      icon: overall === 'healthy' ? 'check' : 'close',
      tint: overall === 'healthy' ? 'green' : 'pink',
    },
    { id: 'mode', label: t('sysHealth.mode'), value: modeLabel, sub: undefined, icon: 'system', tint: 'violet' },
    {
      id: 'failed',
      label: t('sysHealth.failedChecks'),
      value: diag.data ? `${diag.data.failed ?? 0} / ${checks.length}` : diag.isError ? '—' : '…',
      sub: undefined,
      icon: 'bell',
      tint: diag.data?.failed ? 'amber' : 'grey',
    },
  ] as const;

  const renderChecks = () => {
    if (diag.isError && !diag.data) return <ErrorState onRetry={() => diag.refetch()} />;
    if (diag.isPending) return <Skeleton height={200} />;
    if (!checks.length) return <EmptyState title={t('sysHealth.noChecks')} />;
    return checks.map((c) => {
      const badge = (
        <Badge
          testID={`sys-check-badge-${c.component}`}
          label={c.status === 'ok' ? t('sysHealth.ok') : t('sysHealth.fail')}
          tone={checkTone(c)}
        />
      );
      return (
        <ListRow
          key={c.component}
          testID={`sys-check-${c.component}`}
          title={t(`sysHealth.comp_${c.component}`, { defaultValue: c.component })}
          // Tafsilot (xato matni) — bir qatorli subtitle emas, 3 qatorgacha (telefonda kesilib qolardi).
          below={
            c.detail || compact ? (
              <View style={styles.belowCol}>
                {!!c.detail && (
                  <Text variant="caption" tone="subtle" numberOfLines={3} testID={`sys-check-detail-${c.component}`}>
                    {c.detail}
                  </Text>
                )}
                {compact && badge}
              </View>
            ) : undefined
          }
          right={compact ? undefined : <View>{badge}</View>}
        />
      );
    });
  };

  const renderIncidents = () => {
    if (incidents.isError && !incidents.data) return <ErrorState onRetry={() => incidents.refetch()} />;
    if (incidents.isPending) return <Skeleton height={140} />;
    const rows = incidents.data ?? [];
    if (!rows.length) {
      return <EmptyState title={t('sysHealth.noIncidents')} message={t('sysHealth.noIncidentsHint')} />;
    }
    return rows.map((i) => {
      const resolved = incidentResolved(i);
      const minutes = incidentMinutes(i.duration_seconds);
      const kind =
        i.kind && (INCIDENT_KINDS as readonly string[]).includes(i.kind) ? t(`sysHealth.kind_${i.kind}`) : i.kind;
      const when = `${formatTashkentDateTime(i.detected_at)}${
        minutes != null ? ` · ${t('sysHealth.minutes', { count: minutes })}` : ''
      }`;
      const badge = (
        <Badge
          label={resolved ? t('sysHealth.resolved') : t('sysHealth.open')}
          tone={resolved ? 'success' : 'danger'}
        />
      );
      // Sabab/xabar (masalan, to'xtatish sababi) — sarlavha ostida, ikki qatorgacha.
      const message = i.message ? (
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {i.message}
        </Text>
      ) : null;
      return (
        <ListRow
          key={i.id}
          testID={`sys-incident-${i.id}`}
          title={i.title || kind || `#${i.id}`}
          subtitle={when}
          below={
            compact || message ? (
              <View style={styles.belowCol}>
                {message}
                {compact && badge}
              </View>
            ) : undefined
          }
          right={compact ? undefined : <View>{badge}</View>}
        />
      );
    });
  };

  const changedAt = state.data?.changed_at;
  // Server yozgan tizim sababi (resume/recovery) — tarjimada; erkin matn — o'zicha.
  const reasonKey = systemReasonKey(state.data?.reason);

  return (
    <View style={styles.root}>
      <Screen
        testID="sys-health-screen"
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        maxWidth={LIST_MAX_WIDTH}
      >
        {header}
        <View style={styles.tiles}>
          {tiles.map((x) => (
            <View key={x.id} style={{ flexBasis: basis, flexGrow: 1 }}>
              <StatTile
                testID={`sys-tile-${x.id}`}
                label={x.label}
                value={x.value}
                sub={x.sub}
                icon={x.icon}
                tint={x.tint}
              />
            </View>
          ))}
        </View>

        <Card title={t('sysHealth.ops')} icon="settings" tint="grey" style={styles.card}>
          <View style={styles.ops}>
            <Text variant="caption" tone="subtle">
              {t('sysHealth.opsHint')}
            </Text>
            {!!state.data?.reason && (
              <Text variant="label" tone="muted" testID="sys-ops-reason">
                {reasonKey ? t(reasonKey) : state.data.reason}
              </Text>
            )}
            {!!changedAt && (
              <Text variant="caption" tone="subtle">
                {formatTashkentDateTime(changedAt)}
                {state.data?.changed_by_name ? ` · ${t('sysHealth.changedBy')}: ${state.data.changed_by_name}` : ''}
              </Text>
            )}
            {state.isError && !state.data ? (
              <ErrorState onRetry={() => state.refetch()} />
            ) : state.isPending ? null : (
              <View style={styles.actions}>{opsActions(mode).map(actionButton)}</View>
            )}
          </View>
        </Card>

        <Card title={t('sysHealth.checks')} icon="chart" tint="drop" style={styles.card}>
          {!!diag.data?.checked_at && (
            <Text variant="caption" tone="subtle" style={styles.meta} testID="sys-checked-at">
              {`${formatTashkentDateTime(diag.data.checked_at)} · ${diag.data.elapsed_ms ?? 0} ms`}
            </Text>
          )}
          {renderChecks()}
        </Card>

        <Card title={t('sysHealth.incidents')} icon="bell" tint="pink" style={styles.card}>
          <Text variant="caption" tone="subtle" style={styles.meta}>
            {t('sysHealth.incidentsHint')}
          </Text>
          {renderIncidents()}
        </Card>
      </Screen>

      {sheet?.kind === 'shutdown' && (
        <ShutdownSheet
          key={sheet.n}
          onClose={() => setSheet(null)}
          onDone={(data) => {
            setSheet(null);
            toast.success(t('sysHealth.shutdownDone'));
            setReport({ title: t('sysHealth.shutdownReport'), data, n: Date.now() });
          }}
        />
      )}
      {sheet?.kind === 'run' && (
        <RecoverySheet
          key={sheet.n}
          onClose={() => setSheet(null)}
          onDone={(data) => {
            setSheet(null);
            if (recoveryHasProblems(data)) toast.error(t('sysHealth.recoveryProblems'));
            else toast.success(t('sysHealth.recoveryOk'));
            setReport({ title: t('sysHealth.recoveryReport'), data, n: Date.now() });
          }}
        />
      )}
      {report && (
        <OpsReportSheet key={report.n} title={report.title} data={report.data} onClose={() => setReport(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  card: { marginBottom: 12 },
  ops: { gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  meta: { marginBottom: 4 },
  belowCol: { marginTop: 4, gap: 4 },
});
