// v3 bitta hisobot — web v2 `ReportRunPage` porti: Parametrlar → Ko'rish. Ko'rishda drill
// breadcrumb: katakni bosish batafsil hisobotni shu yerda ochadi (yangi daraja), breadcrumb
// esa saqlangan jadvalga QAYTA SO'ROVSIZ qaytadi (v2 `useReportRun` stack). Ruxsat — server
// katalogi (`reports/catalog` da yo'q hisobot — «topilmadi yoki ruxsat yo'q»).
// Excel/CSV, shablonlar, ustun sozlamalari (prefs), chop etish, KPI hisobotini saqlash — web.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { ChipScroll } from '@/components/ChipScroll';
import { Button, Card, Chip, EmptyState, ErrorState, LoadingView, PageHeader, Screen, Segmented, Text } from '@/ui';
import { reportCatalogQuery } from '../api/queries';
import { useRunReport } from '../api/mutations';
import { ParamsForm } from '../components/ParamsForm';
import { ReportTableView } from '../components/ReportTableView';
import { reportDesc, reportLabel } from '../utils/labels';
import {
  buildRunBody,
  canGenerate,
  initialParams,
  isWebOnlyReport,
  paramErrors,
  reportLang,
  requiredMissing,
} from '../utils/params';
import { popTo, pushLevel, startStack } from '../utils/table';
import type { DrillLevel, DrillRef, ReportParams } from '../utils/types';

type Mode = 'params' | 'view';

export default function ReportRunScreen() {
  const { t, i18n } = useTranslation();
  const { code: raw } = useLocalSearchParams<{ code?: string }>();
  const code = typeof raw === 'string' ? raw : '';
  const user = useAuthStore((s) => s.user);
  const catalog = useQuery(reportCatalogQuery());
  const defn = catalog.data?.items.find((i) => i.code === code);
  const [draft, setDraft] = useState<ReportParams | null>(null);
  const [mode, setMode] = useState<Mode>('params');
  const [stack, setStack] = useState<DrillLevel[]>([]);
  const run = useRunReport();

  if (catalog.isPending) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }
  if (catalog.isError) {
    return (
      <Screen>
        <PageHeader title={t('reports.title')} />
        <ErrorState onRetry={() => catalog.refetch()} />
      </Screen>
    );
  }
  if (!defn) {
    return (
      <Screen>
        <PageHeader title={t('reports.title')} />
        <EmptyState
          title={t('reports.notAllowedTitle')}
          message={t('reports.notAllowedHint')}
          pose="sad"
          action={{ label: t('reports.backToCatalog'), onPress: () => router.back() }}
        />
      </Screen>
    );
  }

  const title = reportLabel(defn.title_key, defn.code);
  const header = <PageHeader title={title} subtitle={reportDesc(defn.code) || undefined} />;
  if (isWebOnlyReport(defn)) {
    return (
      <Screen>
        {header}
        <EmptyState title={t('reports.webOnlyReportTitle')} message={t('reports.webOnlyReportHint')} />
      </Screen>
    );
  }

  // Parametrlar: definitsiya defaultlari + o'z filiali (`branch_id`); foydalanuvchi o'zgartirgach — qoralama.
  const params = draft ?? initialParams(defn.params, resolveEmployeeBranchId(user?.employee));
  const errors = paramErrors(defn.params, params);
  const ready = canGenerate(defn.params, params);
  const lang = reportLang(i18n.language);
  const current = stack[stack.length - 1] ?? null;

  const generate = async () => {
    try {
      const table = await run.mutateAsync({ code, body: buildRunBody(params, lang) });
      setStack(startStack({ drill: null, label: title, table }));
      setMode('view');
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('reports.runFailed')));
    }
  };

  const drill = async (ref: DrillRef, label: string) => {
    try {
      const table = await run.mutateAsync({ code, body: buildRunBody(params, lang, ref) });
      setStack((s) => pushLevel(s, { drill: ref, label, table }));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('reports.runFailed')));
    }
  };

  const generateButton = (
    <Button
      testID="report-generate"
      label={t('reports.generate')}
      icon="chart"
      loading={run.isPending}
      disabled={!ready}
      onPress={() => void generate()}
    />
  );

  return (
    <Screen scroll={mode === 'params'}>
      {header}
      <View style={styles.modes}>
        <Segmented<Mode>
          testID="report-modes"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'params', label: t('reports.modeParams') },
            { value: 'view', label: t('reports.modeView') },
          ]}
        />
      </View>

      {mode === 'params' ? (
        <View style={styles.params}>
          <Card>
            <ParamsForm code={code} defs={defn.params} value={params} errors={errors} onChange={setDraft} />
          </Card>
          {generateButton}
          {requiredMissing(defn.params, params) && (
            <Text variant="caption" tone="subtle">
              {t('reports.fillRequired')}
            </Text>
          )}
          <Text variant="caption" tone="subtle">
            {t('reports.runWebOnly')}
          </Text>
        </View>
      ) : (
        <View style={styles.view}>
          {stack.length > 1 && (
            <ChipScroll contentContainerStyle={styles.crumbs} testID="report-crumbs">
              {stack.map((lvl, i) => (
                <Chip
                  key={i}
                  testID={`report-crumb-${i}`}
                  label={lvl.label}
                  selected={i === stack.length - 1}
                  onPress={() => i < stack.length - 1 && setStack((s) => popTo(s, i))}
                />
              ))}
            </ChipScroll>
          )}
          {run.isPending && !current ? (
            <LoadingView />
          ) : current ? (
            <View style={[styles.flex, run.isPending && styles.busy]}>
              {defn.drills.length > 0 && (
                <Text variant="caption" tone="subtle" style={styles.hint}>
                  {t('reports.drillHint')}
                </Text>
              )}
              <ReportTableView table={current.table} onDrill={(ref, label) => void drill(ref, label)} />
            </View>
          ) : (
            <EmptyState
              title={t('reports.notGeneratedTitle')}
              message={t('reports.notGeneratedHint')}
              action={ready ? { label: t('reports.generate'), onPress: () => void generate() } : undefined}
            />
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  modes: { marginBottom: 12 },
  params: { gap: 12 },
  view: { flex: 1, gap: 8, paddingBottom: 12 },
  crumbs: { gap: 6 },
  flex: { flex: 1 },
  busy: { opacity: 0.6 },
  hint: { marginBottom: 6 },
});
