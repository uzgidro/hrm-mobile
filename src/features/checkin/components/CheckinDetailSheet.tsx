// Telefon belgisi tafsiloti — kadr «Mobil belgilar» va xodimning o'z tarixi uchun bitta oyna.
import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { toast } from '@/lib/toast';
import { getApiErrorMessage } from '@/api/errors';
import { FormInput } from '@/components/FormInput';
import { Badge, Button, ErrorState, Sheet, Skeleton, Text } from '@/ui';
import { checkinDetailQuery } from '../api/queries';
import { useCancelCheckin } from '../api/mutations';
import { formatDistance } from '../lib/capture';

/**
 * Belgi tafsiloti: surat, vaqt, eng yaqin joy, masofa, aniqlik, xarita va (bekor qilingan bo'lsa)
 * TO'LIQ sabab + kim bekor qilgani. Kadr ro'yxatida `canCancel` bilan bekor qilish ham; xodim
 * o'z tarixida faqat ko'radi (2026-10-06: «sababi kesilib tashlanmoqda … bosib ko'ra olsin»).
 */
export function CheckinDetailSheet({ id, onClose, canCancel = false }: { id: number; onClose: () => void; canCancel?: boolean }) {
  const { t } = useTranslation();
  const q = useQuery(checkinDetailQuery(id));
  const cancel = useCancelCheckin();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const r = q.data;

  const doCancel = async () => {
    if (reason.trim().length < 3) return setError(t('checkin.hr.reasonMin'));
    try {
      await cancel.mutateAsync({ id, reason });
      toast.success(t('checkin.hr.cancelled'));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const kv = (k: string, v?: string | null) =>
    v ? (
      <View style={styles.kv}>
        <Text variant="caption" tone="muted">
          {k}
        </Text>
        <Text variant="label" style={styles.kvValue}>
          {v}
        </Text>
      </View>
    ) : null;

  return (
    <Sheet visible onClose={onClose} title={r?.employee?.legal_name ?? t('checkin.hr.detailTitle')}>
      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : !r ? (
        <Skeleton height={260} />
      ) : (
        // Varaqda skroll yo'q — haqiqiy surat + bekor qilish formasi bilan tasdiq tugmasi ekrandan
        // tashqarida qolardi (jonli sinov 2026-10-06).
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.sheet}
          keyboardShouldPersistTaps="handled"
          testID="hr-checkin-detail"
        >
          {!!(r.photo_path || r.photo_thumb_path) && (
            <Image source={{ uri: r.photo_path || r.photo_thumb_path! }} style={styles.photo} contentFit="cover" />
          )}
          <View style={styles.badges}>
            <Badge label={t(`checkin.dir_${r.direction_type}`, { defaultValue: r.direction_type })} tone="info" />
            {r.status === 'cancelled' ? (
              <Badge label={t('checkin.statusCancelled')} tone="danger" />
            ) : (
              <Badge label={t('checkin.statusActive')} tone="success" />
            )}
            {r.is_far && <Badge label={t('checkin.far')} tone="warning" />}
          </View>
          {kv(t('checkin.hr.captured'), dayjs(r.happen_time).format('DD.MM.YYYY HH:mm'))}
          {kv(t('checkin.hr.received'), dayjs(r.received_at).format('DD.MM.YYYY HH:mm'))}
          {kv(
            t('checkin.nearest'),
            r.nearest_location?.name
              ? [r.nearest_location.name, r.nearest_location.organization_branch?.name].filter(Boolean).join(' · ')
              : null,
          )}
          {kv(t('checkin.hr.destination'), r.destination_branch?.name)}
          {kv(t('checkin.hr.distance'), formatDistance(r.distance_m))}
          {kv(t('checkin.hr.accuracy'), r.accuracy_m != null ? `±${Math.round(r.accuracy_m)} m` : null)}
          {/* Sabab uzun bo'lishi mumkin — o'ng ustunga siqilmaydi, to'liq blok bo'lib chiqadi. */}
          {r.status === 'cancelled' && !!r.cancel_reason && (
            <View style={styles.reason} testID="checkin-cancel-reason">
              <Text variant="caption" tone="muted">
                {t('checkin.cancelReasonLabel')}
              </Text>
              <Text variant="body">{r.cancel_reason}</Text>
            </View>
          )}
          {r.status === 'cancelled' && !!r.cancelled_by?.legal_name && (
            <Text variant="caption" tone="muted">
              {t('checkin.cancelledBy', { name: r.cancelled_by.legal_name })}
            </Text>
          )}
          <Button
            label={t('checkin.openMap')}
            variant="soft"
            icon="mapPin"
            full
            onPress={() => void Linking.openURL(r.map_url)}
          />
          {canCancel && r.status === 'active' &&
            (cancelling ? (
              <View style={styles.sheet}>
                <Text variant="caption" tone="muted">
                  {t('checkin.hr.cancelHint')}
                </Text>
                <FormInput
                  testID="hr-checkin-cancel-reason"
                  label={t('checkin.cancelReasonLabel')}
                  value={reason}
                  onChangeText={(v) => {
                    setReason(v);
                    setError(undefined);
                  }}
                  error={error}
                  required
                  multiline
                />
                <Button
                  testID="hr-checkin-cancel-confirm"
                  label={t('checkin.hr.cancel')}
                  variant="danger"
                  full
                  loading={cancel.isPending}
                  onPress={() => void doCancel()}
                />
                <Button label={t('common.cancel')} variant="ghost" full onPress={() => setCancelling(false)} />
              </View>
            ) : (
              <Button
                testID="hr-checkin-cancel"
                label={t('checkin.hr.cancel')}
                variant="dangerGhost"
                full
                onPress={() => setCancelling(true)}
              />
            ))}
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: 10 },
  photo: { width: '100%', height: 240, borderRadius: 16 },
  scroll: { flexShrink: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  kvValue: { flexShrink: 1, textAlign: 'right' },
  reason: { gap: 4 },
});
