// So'rov tafsiloti: progress zanjiri, holat tarixi, amallar. Reviewer — keyingi
// holat + izoh (rad etishda sabab shart); egasi — «qabul qilindi» holatida bekor.
// Hujjatni shakllantirish/yuklab olish — web'da.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { FormInput } from '@/components/FormInput';
import { Badge, Button, ProgressBar, Sheet, Skeleton, Text, type Tone, ErrorState } from '@/ui';
import { serviceRequestQuery } from '../api/queries';
import { useCancelServiceRequest, useChangeServiceStatus } from '../api/mutations';
import { STATUS_CHAIN, canCancel, nextStates, validateTransition, type ServiceStatus } from '../utils/services';

export const STATUS_TONE: Record<ServiceStatus, Tone> = {
  accepted: 'neutral',
  in_review: 'warning',
  in_progress: 'info',
  ready: 'brand',
  issued: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

const fmt = (d?: string | null) => (d ? dayjs(d).format('DD.MM.YYYY HH:mm') : '—');

export function ServiceDetailSheet({
  id,
  canReview,
  myEmployeeId,
  onClose,
}: {
  id: number;
  canReview: boolean;
  myEmployeeId?: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const q = useQuery(serviceRequestQuery(id));
  const change = useChangeServiceStatus();
  const cancel = useCancelServiceRequest();
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const r = q.data;

  const move = async (to: ServiceStatus) => {
    const err = validateTransition(to, comment);
    if (err) return setError(t(`services.${err}`));
    // Orqaga yo'l yo'q: noto'g'ri bosish holat tarixida doimiy yozuv qoldiradi (v2 ham tasdiq so'raydi).
    const ok = await confirm({
      title: t(`services.to_${to}`),
      message: r?.number,
      confirmLabel: t(`services.to_${to}`),
      cancelLabel: t('common.cancel'),
      destructive: to === 'rejected',
    });
    if (!ok) return;
    try {
      await change.mutateAsync({ id, to, comment });
      toast.success(t('services.statusChanged'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('services.actionFailed')));
    }
  };

  const doCancel = async () => {
    const ok = await confirm({
      title: t('services.cancelRequest'),
      confirmLabel: t('services.cancelRequest'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancel.mutateAsync({ id, comment });
      toast.success(t('services.cancelled'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('services.actionFailed')));
    }
  };

  // Nomzodlik arizasi ma'lumotlari — reviewer qaror qilishi uchun; bo'sh maydonlar chizilmaydi.
  const payloadEntries = Object.entries(r?.payload ?? {}).filter(
    ([, v]) => typeof v === 'string' && v.trim() !== '',
  ) as [string, string][];
  const step = r ? STATUS_CHAIN.indexOf(r.status) : -1;
  const next = r ? nextStates(r.status) : [];

  return (
    <Sheet scroll visible onClose={onClose} title={r?.number ?? t('services.request')}>
      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : !r ? (
        <Skeleton height={160} />
      ) : (
        <View style={styles.body}>
          <View style={styles.row}>
            <Badge label={t(`services.status_${r.status}`, { defaultValue: r.status })} tone={STATUS_TONE[r.status]} />
            <Text variant="label">{t(`services.type_${r.service_type}`, { defaultValue: r.service_type })}</Text>
          </View>
          {step >= 0 && <ProgressBar value={(step + 1) / STATUS_CHAIN.length} />}
          {!!r.applicant_name && <Text variant="body">{r.applicant_name}</Text>}
          {!!r.assignee_name && (
            <Text variant="caption" tone="muted">{`${t('services.assignee')}: ${r.assignee_name}`}</Text>
          )}
          {!!r.submitted_at && (
            <Text variant="caption" tone="muted">{`${t('services.submittedAt')}: ${fmt(r.submitted_at)}`}</Text>
          )}
          {!!r.due_date && <Text variant="caption" tone="muted">{`${t('services.dueDate')}: ${fmt(r.due_date)}`}</Text>}
          {payloadEntries.map(([k, v]) => (
            <View key={k} testID={`payload-${k}`} style={styles.row}>
              <Text variant="caption" tone="subtle">
                {t(`services.field_${k}`, { defaultValue: k })}
              </Text>
              <Text variant="body">{v}</Text>
            </View>
          ))}
          {!!r.purpose && (
            <Text variant="body" tone="muted">
              {r.purpose}
            </Text>
          )}
          {!!r.resolution && (
            <Text variant="body" tone="muted">
              {r.resolution}
            </Text>
          )}
          {r.has_document && (
            <Text variant="caption" tone="subtle">
              {t('services.documentWebOnly')}
            </Text>
          )}

          {r.events.length > 0 && (
            <View style={styles.history}>
              <Text variant="label">{t('services.history')}</Text>
              {r.events.map((e) => (
                <View key={e.id}>
                  <Text variant="caption">
                    {`${fmt(e.created_at)} · ${t(`services.status_${e.to_status}`, { defaultValue: e.to_status })}${e.actor_name ? ` · ${e.actor_name}` : ''}`}
                  </Text>
                  {!!e.comment && (
                    <Text variant="caption" tone="subtle">
                      {e.comment}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {((canReview && next.length > 0) || canCancel(r, myEmployeeId)) && (
            <FormInput
              testID="service-comment"
              label={t('services.comment')}
              value={comment}
              onChangeText={(v) => {
                setComment(v);
                setError(null);
              }}
              placeholder={t('services.commentPlaceholder')}
            />
          )}
          {!!error && (
            <Text variant="label" tone="danger">
              {error}
            </Text>
          )}
          {canReview &&
            next.map((to) => (
              <Button
                key={to}
                testID={`service-to-${to}`}
                label={t(`services.to_${to}`)}
                variant={to === 'rejected' ? 'ghost' : 'primary'}
                loading={change.isPending}
                full
                onPress={() => void move(to)}
              />
            ))}
          {canCancel(r, myEmployeeId) && (
            <Button
              testID="service-cancel"
              label={t('services.cancelRequest')}
              variant="ghost"
              full
              loading={cancel.isPending}
              onPress={() => void doCancel()}
            />
          )}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  history: { gap: 6, marginTop: 4 },
});
