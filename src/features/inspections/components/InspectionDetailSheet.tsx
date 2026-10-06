// Audit tafsiloti: davr, auditorlar, topilmalar. Huquqlar SERVER qatoridan
// (`can_manage`, `can_add_finding`). Amallar bir oynada, `mode` bilan almashadi:
// boshlash (tasdiq), yakunlash (xulosa), bekor qilish (sabab MAJBURIY),
// topilma qo'shish, topilmani tuzatish (izoh).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { FormInput } from '@/components/FormInput';
import { Badge, Button, Chip, Sheet, Skeleton, Text, type Tone, ErrorState } from '@/ui';
import { inspectionQuery, type Finding } from '../api/queries';
import {
  useAddFinding,
  useCancelInspection,
  useCompleteInspection,
  useResolveFinding,
  useStartInspection,
} from '../api/mutations';
import {
  FINDING_SEVERITIES,
  buildFindingBody,
  canFinish,
  canStart,
  validateCancel,
  validateFinding,
  type FindingForm,
} from '../utils/inspections';

export const STATUS_TONE: Record<string, Tone> = {
  planned: 'neutral',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'danger',
};
const SEVERITY_TONE: Record<string, Tone> = { low: 'neutral', medium: 'warning', high: 'danger' };
const fmt = (d?: string | null) => (d ? dayjs(d).format('DD.MM.YYYY') : '—');

type Mode = null | 'complete' | 'cancel' | 'finding' | { resolve: Finding };
const BLANK_FINDING: FindingForm = { description: '', severity: 'medium', recommendation: '', dueDate: '' };

export function InspectionDetailSheet({ id, onClose }: { id: number; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useQuery(inspectionQuery(id));
  const start = useStartInspection();
  const complete = useCompleteInspection();
  const cancel = useCancelInspection();
  const addFinding = useAddFinding();
  const resolve = useResolveFinding();
  const [mode, setMode] = useState<Mode>(null);
  const [text, setText] = useState(''); // xulosa / bekor sababi / tuzatish izohi
  const [finding, setFinding] = useState<FindingForm>(BLANK_FINDING);
  const [error, setError] = useState<string | null>(null);
  const r = q.data;

  const go = (m: Mode) => {
    setMode(m);
    setText('');
    setFinding(BLANK_FINDING);
    setError(null);
  };

  const run = async (p: Promise<unknown>, okKey: string, close = false) => {
    try {
      await p;
      toast.success(t(okKey));
      if (close) onClose();
      else go(null);
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const doStart = async () => {
    const ok = await confirm({
      title: t('inspections.start'),
      message: r?.title,
      confirmLabel: t('inspections.start'),
      cancelLabel: t('common.cancel'),
    });
    if (ok) await run(start.mutateAsync(id), 'inspections.started');
  };

  const doCancel = () => {
    const err = validateCancel(text);
    if (err) return setError(t(`inspections.${err}`));
    void run(cancel.mutateAsync({ id, reason: text }), 'inspections.cancelled', true);
  };

  const doFinding = () => {
    const err = validateFinding(finding);
    if (err) return setError(t(`inspections.${err}`));
    void run(addFinding.mutateAsync({ id, body: buildFindingBody(finding) }), 'inspections.findingAdded');
  };

  const open = r && !['completed', 'cancelled'].includes(r.status);

  return (
    <Sheet scroll visible onClose={onClose} title={r?.title ?? t('inspections.title')}>
      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : !r ? (
        <Skeleton height={180} />
      ) : (
        <View style={styles.body}>
          <View style={styles.row}>
            <Badge
              label={t(`inspections.status_${r.status}`, { defaultValue: r.status })}
              tone={STATUS_TONE[r.status] ?? 'neutral'}
            />
            <Badge label={t(`inspections.object_${r.object_type}`, { defaultValue: r.object_type })} />
            {!!r.object_label && <Text variant="label">{r.object_label}</Text>}
          </View>
          {!!r.purpose && <Text variant="body">{r.purpose}</Text>}
          {(!!r.period_start || !!r.period_end) && (
            <Text variant="caption" tone="muted">
              {`${t('inspections.period')}: ${fmt(r.period_start)} – ${fmt(r.period_end)}`}
            </Text>
          )}
          {!!r.conclusion && <Text variant="body">{`${t('inspections.conclusion')}: ${r.conclusion}`}</Text>}
          {!!r.cancel_reason && (
            <Text variant="body" tone="danger">
              {`${t('inspections.cancelReason')}: ${r.cancel_reason}`}
            </Text>
          )}
          {(r.members ?? []).length > 0 && (
            <View style={styles.block}>
              <Text variant="label">{t('inspections.members')}</Text>
              {r.members!.map((m) => (
                <Text key={m.id} variant="body">
                  {m.employee_name ?? '—'}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.block}>
            <Text variant="label">{t('inspections.findings', { count: r.findings?.length ?? 0 })}</Text>
            {(r.findings ?? []).length === 0 && (
              <Text variant="caption" tone="muted">
                {t('inspections.noFindings')}
              </Text>
            )}
            {(r.findings ?? []).map((f) => (
              <View key={f.id} style={styles.finding}>
                <View style={styles.row}>
                  <Badge
                    label={t(`inspections.severity_${f.severity}`, { defaultValue: f.severity ?? '' })}
                    tone={SEVERITY_TONE[f.severity ?? ''] ?? 'neutral'}
                  />
                  <Badge
                    label={f.status === 'resolved' ? t('inspections.resolved') : t('inspections.open')}
                    tone={f.status === 'resolved' ? 'success' : 'warning'}
                  />
                  {f.is_overdue && (
                    <Badge testID={`finding-overdue-${f.id}`} label={t('inspections.overdue')} tone="danger" />
                  )}
                </View>
                <Text variant="body">{f.description}</Text>
                {!!f.recommendation && (
                  <Text variant="caption" tone="muted">
                    {`${t('inspections.recommendation')}: ${f.recommendation}`}
                  </Text>
                )}
                {!!f.due_date && (
                  <Text variant="caption" tone="subtle">
                    {`${t('inspections.dueDate')}: ${fmt(f.due_date)}`}
                  </Text>
                )}
                {!!f.resolution_note && (
                  <Text variant="caption" tone="subtle">
                    {f.resolution_note}
                  </Text>
                )}
                {r.can_manage && f.status !== 'resolved' && (
                  <Button
                    testID={`finding-resolve-${f.id}`}
                    label={t('inspections.resolve')}
                    size="sm"
                    variant="soft"
                    onPress={() => go({ resolve: f })}
                  />
                )}
              </View>
            ))}
          </View>

          {/* ── Amal oynasi ─────────────────────────────────────────────── */}
          {mode === 'complete' && (
            <View style={styles.block}>
              <FormInput
                testID="inspection-conclusion"
                label={t('inspections.conclusion')}
                value={text}
                onChangeText={setText}
                multiline
              />
              <Button
                testID="inspection-complete-confirm"
                label={t('inspections.complete')}
                full
                loading={complete.isPending}
                onPress={() => void run(complete.mutateAsync({ id, conclusion: text }), 'inspections.completed', true)}
              />
            </View>
          )}
          {mode === 'cancel' && (
            <View style={styles.block}>
              <FormInput
                testID="inspection-cancel-reason"
                label={t('inspections.cancelReason')}
                value={text}
                onChangeText={(v) => {
                  setText(v);
                  setError(null);
                }}
                multiline
              />
              <Button
                testID="inspection-cancel-confirm"
                label={t('inspections.cancel')}
                variant="danger"
                full
                loading={cancel.isPending}
                onPress={doCancel}
              />
            </View>
          )}
          {mode === 'finding' && (
            <View style={styles.block}>
              <FormInput
                testID="finding-description"
                label={t('inspections.findingText')}
                value={finding.description}
                onChangeText={(v) => {
                  setFinding((f) => ({ ...f, description: v }));
                  setError(null);
                }}
                multiline
              />
              <View style={styles.row}>
                {FINDING_SEVERITIES.map((s) => (
                  <Chip
                    key={s}
                    label={t(`inspections.severity_${s}`)}
                    selected={finding.severity === s}
                    onPress={() => setFinding((f) => ({ ...f, severity: s }))}
                  />
                ))}
              </View>
              <FormInput
                label={t('inspections.recommendation')}
                value={finding.recommendation}
                onChangeText={(v) => setFinding((f) => ({ ...f, recommendation: v }))}
                multiline
              />
              <Button
                testID="finding-save"
                label={t('common.add')}
                full
                loading={addFinding.isPending}
                onPress={doFinding}
              />
            </View>
          )}
          {mode !== null && typeof mode === 'object' && (
            <View style={styles.block}>
              <Text variant="label">{mode.resolve.description}</Text>
              <FormInput label={t('inspections.resolutionNote')} value={text} onChangeText={setText} multiline />
              <Button
                testID="finding-resolve-confirm"
                label={t('inspections.resolve')}
                full
                loading={resolve.isPending}
                onPress={() =>
                  void run(
                    resolve.mutateAsync({ id, findingId: mode.resolve.id, note: text }),
                    'inspections.findingResolved',
                  )
                }
              />
            </View>
          )}
          {!!error && (
            <Text variant="label" tone="danger">
              {error}
            </Text>
          )}

          {mode === null && (
            <View style={styles.actions}>
              {r.can_manage && canStart(r.status) && (
                <Button
                  testID="inspection-start"
                  label={t('inspections.start')}
                  full
                  loading={start.isPending}
                  onPress={() => void doStart()}
                />
              )}
              {r.can_manage && canFinish(r.status) && (
                <Button
                  testID="inspection-complete"
                  label={t('inspections.complete')}
                  variant="soft"
                  full
                  onPress={() => go('complete')}
                />
              )}
              {r.can_add_finding && open && (
                <Button
                  testID="finding-add"
                  label={t('inspections.addFinding')}
                  variant="soft"
                  full
                  onPress={() => go('finding')}
                />
              )}
              {r.can_manage && canFinish(r.status) && (
                <Button
                  testID="inspection-cancel"
                  label={t('inspections.cancel')}
                  variant="ghost"
                  full
                  onPress={() => go('cancel')}
                />
              )}
            </View>
          )}
          {mode !== null && <Button label={t('common.cancel')} variant="ghost" full onPress={() => go(null)} />}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  block: { gap: 8, marginTop: 4 },
  finding: { gap: 4, paddingVertical: 6 },
  actions: { gap: 8, marginTop: 6 },
});
