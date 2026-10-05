// Yig'ilish tafsiloti va amallari (v2 qator tugmalari). Har tugma serverning qator
// bayroqlaridan (`can_manage` / `can_approve`) — mobil o'zi taxmin qilmaydi.
// `start_url` va `host_key` faqat mutatsiya javobidan, hech qachon keshlanmaydi.
// Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { isHttpUrl } from '@/utils/safeUrl';
import { weekdayName } from '@/i18n/dates';
import { FormInput } from '@/components/FormInput';
import { Badge, Button, Card, Sheet, Text } from '@/ui';
import {
  useApproveZoomMeeting,
  useCancelZoomMeeting,
  useCancelZoomSeries,
  useRejectZoomMeeting,
  useStartZoomMeeting,
  useZoomHostKey,
} from '../api/mutations';
import {
  buildInvitation,
  cancelLabelKey,
  formatMeetingId,
  inTashkent,
  isValidReason,
  meetingActions,
  recurrenceLabel,
  startOutcome,
  statusTone,
  timeRangeText,
  type ZoomMeeting,
} from '../utils/zoom';
import { LiveMark } from './MeetingRow';

export function ZoomDetailSheet({ meeting: m, onClose }: { meeting: ZoomMeeting; onClose: () => void }) {
  const { t } = useTranslation();
  const approve = useApproveZoomMeeting();
  const reject = useRejectZoomMeeting();
  const cancel = useCancelZoomMeeting();
  const cancelSeries = useCancelZoomSeries();
  const start = useStartZoomMeeting();
  const hostKey = useZoomHostKey();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  // Faqat shu varaq ochiq turganida xotirada — query keshiga tushmaydi.
  const [issuedKey, setIssuedKey] = useState<{ key: string; hint?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const can = meetingActions(m);
  const canJoin = can.join && isHttpUrl(m.join_url);
  const startAt = inTashkent(m.start_at);
  const busy = approve.isPending || reject.isPending || cancel.isPending || cancelSeries.isPending;
  const fail = (e: unknown) => setError(getApiErrorMessage(e, t('errors.generic')));

  /** Tasdiqdan keyin amal; muvaffaqiyatda toast va varaq yopiladi (v2 `confirmAct`). */
  const confirmed = async (
    opts: { title: string; message?: string; confirmLabel: string; destructive?: boolean },
    run: () => Promise<unknown>,
    okKey: string,
  ) => {
    setError(null);
    const ok = await confirm({ ...opts, cancelLabel: t('common.cancel') });
    if (!ok) return;
    try {
      await run();
      toast.success(t(okKey));
      onClose();
    } catch (e) {
      fail(e);
    }
  };

  const join = () => {
    if (canJoin) Linking.openURL(m.join_url!.trim()).catch(() => toast.error(t('zoom.linkUnsafe')));
  };

  const share = async () => {
    try {
      await Share.share({ message: buildInvitation(m, t) });
    } catch {
      // Foydalanuvchi bekor qildi yoki tizim ulashish oynasini ocholmadi — jim.
    }
  };

  /**
   * «Boshlash»: litsenziya tekshiruvi + so'ralgan yozuv yoqiladi + host havolasi darhol
   * ochiladi (bir martalik, muddati o'tadi — ko'rsatilmaydi). Toast yozuv bilan nima
   * bo'lganini aytadi: «armed» va «failed» boshqacha ko'rinmasa farqi bilinmaydi.
   */
  const doStart = async () => {
    setError(null);
    try {
      const r = await start.mutateAsync(m.id);
      // Yig'ilish serverda allaqachon boshlangan — havola ochilmasa ham bu xato EMAS.
      const opened =
        isHttpUrl(r?.start_url) &&
        (await Linking.openURL(r.start_url.trim()).then(
          () => true,
          () => false,
        ));
      if (!opened) toast.error(t('zoom.linkUnsafe'));
      const o = startOutcome(r ?? { recording: 'off' });
      toast[o.kind](t(o.key, o.params));
      onClose();
    } catch (e) {
      fail(e);
    }
  };

  const doHostKey = async () => {
    setError(null);
    const ok = await confirm({
      title: t('zoom.hostKey'),
      message: t('zoom.hostKeyConfirm'),
      confirmLabel: t('zoom.hostKey'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      const r = await hostKey.mutateAsync(m.id);
      if (r?.host_key) {
        setIssuedKey({ key: r.host_key, hint: r.hint });
        toast.success(t('zoom.hostKeyIssued'));
      }
    } catch (e) {
      fail(e);
    }
  };

  const doReject = async () => {
    if (!isValidReason(reason)) return setError(t('zoom.reasonRequired'));
    setError(null);
    try {
      await reject.mutateAsync({ id: m.id, reason });
      toast.success(t('zoom.rejected'));
      onClose();
    } catch (e) {
      fail(e);
    }
  };

  const cancelKey = cancelLabelKey(m);
  const topic = m.topic || '—';

  // Bitta asosiy (brand) amal: hali boshlanmagan yig'ilishni boshqaruvchi — «Boshlash»
  // (yozuv va host faqat shu bilan yoqiladi), qolgan hollarda — «Qo'shilish».
  const startFirst = can.start && !m.is_live;
  const startBlock = (
    <View style={styles.actions}>
      <Button
        testID="zoom-start"
        label={m.is_live ? t('zoom.joinAsHost') : t('zoom.start')}
        variant={startFirst || !canJoin ? 'primary' : 'soft'}
        onPress={() => void doStart()}
        loading={start.isPending}
        full
      />
      <Text variant="caption" tone="subtle">
        {m.recording_mode === 'cloud' ? t('zoom.startHintRecord') : t('zoom.startHint')}
      </Text>
    </View>
  );

  return (
    <Sheet visible onClose={onClose} title={topic}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.badges}>
          {m.is_live ? (
            <LiveMark m={m} />
          ) : (
            <Badge label={t(`zoom.status_${m.status}`, { defaultValue: m.status })} tone={statusTone(m.status)} />
          )}
          {m.source === 'zoom' && <Badge label={t('zoom.sourceZoom')} tone="info" />}
          {!!m.series_id && (
            <Badge
              label={t('zoom.seriesBadge', { index: m.series_index ?? '?', total: m.series_total ?? '?' })}
              tone="brand"
            />
          )}
        </View>

        <View style={styles.info}>
          <Text variant="body" weight="600">
            {startAt ? `${startAt.format('DD.MM.YYYY')}, ${weekdayName(startAt.day())}` : '—'}
          </Text>
          <Text variant="body" tone="muted">
            {timeRangeText(m, t)}
          </Text>
          {!!m.series_id && !!m.recurrence && (
            <Text variant="caption" tone="subtle">
              {recurrenceLabel(m.recurrence, t)}
            </Text>
          )}
          {!!m.requested_by?.legal_name && (
            <Text variant="caption" tone="muted">{`${t('zoom.requestedBy')}: ${m.requested_by.legal_name}`}</Text>
          )}
          {!!m.approved_by?.legal_name && (
            <Text variant="caption" tone="muted">{`${t('zoom.approvedBy')}: ${m.approved_by.legal_name}`}</Text>
          )}
          {!!m.started_at && !!m.started_by?.legal_name && (
            <Text variant="caption" tone="muted">
              {`${t('zoom.startedBy')}: ${m.started_by.legal_name} · ${inTashkent(m.started_at)?.format('DD.MM HH:mm') ?? ''}`}
            </Text>
          )}
          {can.join && !!m.zoom_meeting_id && (
            <Text variant="caption" tone="muted" testID="zoom-meeting-id">
              {`${t('zoom.invId')}: ${formatMeetingId(m.zoom_meeting_id)}`}
            </Text>
          )}
          {can.passcode && (
            <Text variant="caption" tone="muted" selectable>{`${t('zoom.passcode')}: ${m.passcode}`}</Text>
          )}
          {m.recording_mode === 'cloud' && m.status === 'approved' && (
            <Text variant="caption" tone={m.recording_started_at ? 'danger' : 'subtle'}>
              {m.recording_started_at ? t('zoom.recordingOn') : t('zoom.recordingPlanned')}
            </Text>
          )}
          {!!m.reject_reason && (
            <Text variant="body" tone="danger">
              {m.reject_reason}
            </Text>
          )}
          {!!m.agenda && (
            <Text variant="body" tone="muted">
              {m.agenda}
            </Text>
          )}
        </View>

        {startFirst && startBlock}

        {canJoin && (
          <View style={styles.actions}>
            <Button
              testID="zoom-join"
              label={t('zoom.join')}
              icon="globe"
              variant={startFirst ? 'soft' : 'primary'}
              onPress={join}
              full
            />
            <Button
              testID="zoom-share"
              label={t('zoom.shareInvitation')}
              variant="soft"
              onPress={() => void share()}
              full
            />
            <Text variant="caption" tone="subtle">
              {t('zoom.shareInvitationHint')}
            </Text>
          </View>
        )}

        {can.start && !startFirst && startBlock}

        {can.hostKey && (
          <View style={styles.actions}>
            {issuedKey ? (
              <Card testID="zoom-host-key">
                <Text variant="caption" tone="muted">
                  {t('zoom.hostKey')}
                </Text>
                <Text variant="number" selectable>
                  {issuedKey.key}
                </Text>
                <Text variant="caption" tone="subtle">
                  {t('zoom.hostKeyHint')}
                </Text>
              </Card>
            ) : (
              <Button
                testID="zoom-host-key-btn"
                label={t('zoom.hostKey')}
                icon="lock"
                variant="soft"
                onPress={() => void doHostKey()}
                loading={hostKey.isPending}
                full
              />
            )}
          </View>
        )}

        {can.approve && !rejecting && (
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                testID="zoom-approve"
                label={t('zoom.approve')}
                icon="check"
                disabled={busy}
                loading={approve.isPending}
                onPress={() =>
                  void confirmed(
                    { title: t('zoom.approve'), message: topic, confirmLabel: t('zoom.approve') },
                    () => approve.mutateAsync(m.id),
                    'zoom.approved',
                  )
                }
                full
              />
            </View>
            <View style={styles.flex}>
              <Button
                testID="zoom-reject"
                label={t('zoom.reject')}
                icon="close"
                variant="danger"
                disabled={busy}
                onPress={() => {
                  setError(null);
                  setRejecting(true);
                }}
                full
              />
            </View>
          </View>
        )}
        {can.reject && rejecting && (
          <View style={styles.actions}>
            <FormInput
              testID="zoom-reject-reason"
              label={t('zoom.rejectReason')}
              value={reason}
              onChangeText={setReason}
              multiline
              required
            />
            <Button
              testID="zoom-reject-submit"
              label={t('zoom.reject')}
              variant="danger"
              disabled={!reason.trim()}
              loading={reject.isPending}
              onPress={() => void doReject()}
              full
            />
            <Button label={t('common.cancel')} variant="ghost" onPress={() => setRejecting(false)} full />
          </View>
        )}

        {can.cancel && (
          <View style={styles.actions}>
            <Button
              testID="zoom-cancel"
              label={t(cancelKey)}
              variant="dangerGhost"
              disabled={busy}
              loading={cancel.isPending}
              onPress={() =>
                void confirmed(
                  { title: t(cancelKey), message: topic, confirmLabel: t(cancelKey), destructive: true },
                  () => cancel.mutateAsync(m.id),
                  'zoom.cancelled',
                )
              }
              full
            />
            {!!m.series_id && cancelKey === 'zoom.cancelThisDay' && (
              <Text variant="caption" tone="subtle">
                {t('zoom.cancelThisDayHint')}
              </Text>
            )}
          </View>
        )}
        {can.cancelSeries && (
          <Button
            testID="zoom-cancel-series"
            label={t('zoom.cancelSeries')}
            variant="dangerGhost"
            disabled={busy}
            loading={cancelSeries.isPending}
            onPress={() =>
              void confirmed(
                {
                  title: t('zoom.cancelSeriesTitle'),
                  message: t('zoom.cancelSeriesConfirm', { topic, total: m.series_total ?? '' }),
                  confirmLabel: t('zoom.cancelSeries'),
                  destructive: true,
                },
                () => cancelSeries.mutateAsync(m.id),
                'zoom.seriesCancelled',
              )
            }
            full
          />
        )}

        {!!error && (
          <Text variant="label" tone="danger" testID="zoom-error">
            {error}
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 14, paddingBottom: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  info: { gap: 4 },
  actions: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
