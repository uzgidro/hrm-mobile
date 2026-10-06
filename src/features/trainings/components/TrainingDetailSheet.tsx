// Yozuv tafsiloti. Yozish huquqi bo'lsa — tahrirlash va o'chirish (tasdiq bilan).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { Badge, Button, Sheet, Text, type Tone } from '@/ui';
import type { Training } from '../api/queries';
import { useDeleteTraining } from '../api/mutations';
import { daysLeft, expiryTone } from '../utils/trainings';

export const STATUS_TONE: Record<string, Tone> = { planned: 'info', completed: 'success', cancelled: 'neutral' };
const fmt = (d?: string | null) => (d ? dayjs(d).format('DD.MM.YYYY') : '—');

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kv}>
      <Text variant="caption" tone="subtle" style={styles.kvLabel}>
        {label}
      </Text>
      <Text variant="body" style={styles.kvValue}>
        {value}
      </Text>
    </View>
  );
}

/** Amal qilish muddati belgisi (ro'yxat va tafsilotda bir xil): o'tgan / necha kun qoldi. */
export function ExpiryBadge({ expires }: { expires?: string | null }) {
  const { t } = useTranslation();
  const left = daysLeft(expires, dayjs().format('YYYY-MM-DD'));
  if (left == null) return null;
  return (
    <Badge
      label={left < 0 ? t('trainings.expiredAgo', { count: -left }) : t('trainings.expiresIn', { count: left })}
      tone={expiryTone(left)}
    />
  );
}

export function TrainingDetailSheet({
  training: r,
  canWrite,
  onClose,
  onEdit,
}: {
  training: Training;
  canWrite: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteTraining();

  const doDelete = async () => {
    const ok = await confirm({
      title: t('trainings.removeTitle'),
      message: t('trainings.removeConfirm', { name: r.program_name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(r.id);
      toast.success(t('trainings.removed'));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <Sheet scroll visible onClose={onClose} title={r.program_name}>
      <View style={styles.body}>
        <View style={styles.badges}>
          <Badge label={t(`trainings.type_${r.training_type}`, { defaultValue: r.training_type })} />
          <Badge
            label={t(`trainings.status_${r.status}`, { defaultValue: r.status })}
            tone={STATUS_TONE[r.status] ?? 'neutral'}
          />
          {!!r.result && (
            <Badge
              label={t(`trainings.result_${r.result}`, { defaultValue: r.result })}
              tone={r.result === 'passed' ? 'success' : 'danger'}
            />
          )}
          <ExpiryBadge expires={r.certificate_expires_at} />
        </View>
        <Row label={t('trainings.employee')} value={r.employee_name ?? '—'} />
        {!!r.provider && <Row label={t('trainings.provider')} value={r.provider} />}
        <Row label={t('trainings.dates')} value={`${fmt(r.start_date)} – ${fmt(r.end_date)}`} />
        {r.hours != null && <Row label={t('trainings.hours')} value={t('trainings.hoursN', { count: r.hours })} />}
        {r.cost != null && <Row label={t('trainings.cost')} value={String(r.cost)} />}
        {!!r.certificate_number && <Row label={t('trainings.certificateNumber')} value={r.certificate_number} />}
        {!!r.certificate_expires_at && <Row label={t('trainings.expiresAt')} value={fmt(r.certificate_expires_at)} />}
        {!!r.note && <Row label={t('trainings.note')} value={r.note} />}
        {canWrite && (
          <View style={styles.actions}>
            <Button testID="training-edit" label={t('common.edit')} variant="soft" full onPress={onEdit} />
            <Button
              testID="training-delete"
              label={t('common.delete')}
              variant="ghost"
              full
              loading={remove.isPending}
              onPress={() => void doDelete()}
            />
          </View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 8 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  kv: { flexDirection: 'row', gap: 12 },
  kvLabel: { width: '40%' },
  kvValue: { flex: 1 },
  actions: { gap: 8, marginTop: 6 },
});
