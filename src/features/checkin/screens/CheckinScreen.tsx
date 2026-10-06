// «Keldim / Ketdim» — xizmat safaridagi xodim telefondan davomatga belgi qo'yadi (2026-10-06).
// Oqim: surat (FAQAT kamera, galereya yo'q) → joylashuv (ekran ochilishi bilan AVTOMATIK, qo'lda
// kiritish yo'q) → yuborish. Tarmoq bo'lmasa belgi telefonda saqlanadi va keyin o'z vaqti bilan
// ketadi (lib/queue). Pastda — oxirgi 30 kun belgilari (bekor qilinganlari sababi bilan).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { moduleTint, radii } from '@/theme/tokens';
import { toast } from '@/lib/toast';
import { goBackOr } from '@/lib/goBack';
import { getApiErrorMessage } from '@/api/errors';
import { Icon } from '@/components/Icon';
import { Tomchi } from '@/ui/mascot/Tomchi';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pager,
  Screen,
  Segmented,
  Skeleton,
  Text,
} from '@/ui';
import { checkinKeys, checkinStatusQuery, myCheckinsQuery } from '../api/queries';
import { useInvalidateCheckins } from '../api/mutations';
import {
  CaptureError,
  formatDistance,
  getCheckinLocation,
  nearestDestination,
  takeCheckinPhoto,
  type CapturedLocation,
  type CapturedPhoto,
} from '../lib/capture';
import { newClientUuid, submitCheckin } from '../lib/queue';
import { reloadPending } from '../lib/useCheckinQueue';
import { nextDirection } from '../components/TripCheckinCard';
import { CheckinDetailSheet } from '../components/CheckinDetailSheet';
import { checkinPlace, type CheckinDirection, type MobileCheckin } from '../types';

type LocState =
  | { kind: 'locating' }
  | { kind: 'ready'; loc: CapturedLocation }
  | { kind: 'error'; code: CaptureError['code'] | 'unknown' };

type Done = { kind: 'sent'; checkin: MobileCheckin } | { kind: 'queued'; at: string };

const CAPTURE_MESSAGE: Record<string, string> = {
  camera_denied: 'checkin.cameraDenied',
  location_denied: 'checkin.locationDenied',
  location_unavailable: 'checkin.locationUnavailable',
  location_mocked: 'checkin.locationMocked',
  photo_failed: 'checkin.photoFailed',
};

export default function CheckinScreen() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ dir?: string }>();
  const hasEmployee = useAuthStore((s) => !!s.user?.employee?.id);
  const statusQ = useQuery(checkinStatusQuery(hasEmployee));
  const status = statusQ.data;
  const invalidate = useInvalidateCheckins();

  // Tanlanmagan bo'lsa — bugungi belgilarga qarab (oxirgisi «Keldim» bo'lsa «Ketdim»); havola `?dir=` ustun.
  const [dirChoice, setDirChoice] = useState<CheckinDirection | null>(
    params.dir === 'exit' || params.dir === 'entrance' ? params.dir : null,
  );
  const direction: CheckinDirection = dirChoice ?? (status ? nextDirection(status.today) : 'entrance');

  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [photoAt, setPhotoAt] = useState<string | null>(null);
  const [loc, setLoc] = useState<LocState>({ kind: 'locating' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const uuid = useRef(newClientUuid());

  const resolveLocation = useCallback(
    (alive: () => boolean = () => true) =>
      getCheckinLocation()
        .then((l) => alive() && setLoc({ kind: 'ready', loc: l }))
        .catch((e) => alive() && setLoc({ kind: 'error', code: e instanceof CaptureError ? e.code : 'unknown' })),
    [],
  );
  const locate = () => {
    setLoc({ kind: 'locating' });
    void resolveLocation();
  };

  const canCheckIn = !!status?.can_check_in;
  // Joylashuv AVTOMATIK (qo'lda kiritish yo'q): safar bor ekan, ekran ochilishi bilan aniqlanadi.
  useEffect(() => {
    if (!canCheckIn) return;
    let alive = true;
    void resolveLocation(() => alive);
    return () => {
      alive = false;
    };
  }, [canCheckIn, resolveLocation]);

  const shoot = async () => {
    try {
      const p = await takeCheckinPhoto();
      if (p) {
        setPhoto(p);
        setPhotoAt(new Date().toISOString());
      }
    } catch (e) {
      toast.error(t(CAPTURE_MESSAGE[e instanceof CaptureError ? e.code : 'photo_failed'] ?? 'checkin.photoFailed'));
    }
  };

  const trip = status?.trip;
  const nearest = useMemo(
    () => (loc.kind === 'ready' && trip ? nearestDestination(loc.loc, trip.destination_locations) : null),
    [loc, trip],
  );
  const far = nearest != null && nearest.meters > (status?.far_distance_m ?? 1000);

  const submit = async () => {
    if (!photo || !photoAt) return toast.error(t('checkin.needPhoto'));
    if (loc.kind !== 'ready') return toast.error(t('checkin.needLocation'));
    setSubmitting(true);
    try {
      const res = await submitCheckin({
        photo_base64: photo.base64,
        latitude: loc.loc.latitude,
        longitude: loc.loc.longitude,
        ...(loc.loc.accuracy_m != null ? { accuracy_m: loc.loc.accuracy_m } : {}),
        captured_at: photoAt,
        direction,
        client_uuid: uuid.current,
      });
      if (res.kind === 'sent') {
        toast.success(t('checkin.sent'));
        setDone({ kind: 'sent', checkin: res.checkin });
        void invalidate();
      } else {
        toast.info(t('checkin.queued'), 6000);
        setDone({ kind: 'queued', at: photoAt });
        await reloadPending();
      }
      uuid.current = newClientUuid();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('checkin.sendFailed')));
      // Safar holati o'zgargan bo'lishi mumkin (kadr bekor qildi / kun almashdi).
      void qc.invalidateQueries({ queryKey: checkinKeys.status() });
    } finally {
      setSubmitting(false);
    }
  };

  const tint = moduleTint(c, 'green');

  return (
    <Screen
      refreshing={statusQ.isRefetching}
      onRefresh={() => void qc.invalidateQueries({ queryKey: checkinKeys.all })}
      testID="checkin-screen"
    >
      <PageHeader title={t('checkin.title')} subtitle={status?.trip?.destination_branch?.name ?? undefined} />

      {!hasEmployee ? (
        <EmptyState title={t('checkin.notAvailableTitle')} message={t('checkin.noEmployeeHint')} />
      ) : statusQ.isError ? (
        <ErrorState onRetry={() => statusQ.refetch()} />
      ) : statusQ.isPending ? (
        <Skeleton height={320} />
      ) : done ? (
        <SuccessCard
          done={done}
          place={done.kind === 'sent' ? checkinPlace(done.checkin) : status?.trip?.destination_branch?.name}
          direction={direction}
          onClose={() => goBackOr('/')}
        />
      ) : !canCheckIn ? (
        <EmptyState title={t('checkin.notAvailableTitle')} message={t('checkin.notAvailableHint')} />
      ) : (
        <View style={styles.flow}>
          <Segmented<CheckinDirection>
            testID="checkin-direction"
            value={direction}
            onChange={setDirChoice}
            options={[
              { value: 'entrance', label: t('checkin.dir_entrance') },
              { value: 'exit', label: t('checkin.dir_exit') },
            ]}
          />

          <Card title={t('checkin.stepPhoto')} icon="camera" tint="green">
            {photo ? (
              <View style={styles.photoWrap}>
                <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" testID="checkin-photo" />
                <Button label={t('checkin.retakePhoto')} variant="soft" icon="camera" onPress={() => void shoot()} />
              </View>
            ) : (
              <Pressable
                testID="checkin-take-photo"
                onPress={() => void shoot()}
                accessibilityRole="button"
                accessibilityLabel={t('checkin.takePhoto')}
                style={[styles.shoot, { backgroundColor: tint.wash, borderColor: tint.fg }]}
              >
                <Icon name="camera" size={34} color={tint.fg} />
                <Text variant="heading">{t('checkin.takePhoto')}</Text>
                <Text variant="caption" tone="muted" style={styles.center}>
                  {t('checkin.photoHint')}
                </Text>
              </Pressable>
            )}
          </Card>

          <Card title={t('checkin.stepLocation')} icon="mapPin" tint="drop">
            {loc.kind === 'locating' && (
              <Text variant="body" tone="muted" testID="checkin-locating">
                {t('checkin.locating')}
              </Text>
            )}
            {loc.kind === 'error' && (
              <View style={styles.gap}>
                <Text variant="body" tone="danger" testID="checkin-location-error">
                  {t(CAPTURE_MESSAGE[loc.code] ?? 'checkin.locationUnavailable')}
                </Text>
                <View style={styles.row}>
                  <Button label={t('common.retry')} variant="soft" icon="refresh" onPress={locate} />
                  {loc.code === 'location_denied' && (
                    <Button label={t('checkin.openSettings')} variant="ghost" onPress={() => void Linking.openSettings()} />
                  )}
                </View>
              </View>
            )}
            {loc.kind === 'ready' && (
              <View style={styles.gap} testID="checkin-location-ready">
                <View style={styles.row}>
                  <Icon name="check" size={18} color={c.success} />
                  <Text variant="label" style={styles.flex}>
                    {t('checkin.locationReady')}
                    {loc.loc.accuracy_m != null ? ` · ${t('checkin.accuracy', { m: loc.loc.accuracy_m })}` : ''}
                  </Text>
                  <Pressable onPress={locate} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('checkin.refreshLocation')}>
                    <Icon name="refresh" size={18} color={c.drop} />
                  </Pressable>
                </View>
                {loc.loc.fromCache && (
                  <Text variant="caption" tone="muted">
                    {t('checkin.fromCache')}
                  </Text>
                )}
                {nearest ? (
                  <Text variant="body" testID="checkin-distance">
                    {t('checkin.distanceTo', {
                      place: nearest.point.name || status?.trip?.destination_branch?.name || t('checkin.noDestination'),
                      distance: formatDistance(nearest.meters),
                    })}
                  </Text>
                ) : (
                  // Manzil endi tanlanmaydi (2026-10-06): eng yaqin filial/GES ni server topadi —
                  // xodimga barcha nuqtalar ko'rinmaydi, shuning uchun oldindan hisoblab bo'lmaydi.
                  <Text variant="caption" tone="muted" testID="checkin-distance-server">
                    {t('checkin.distanceByServer')}
                  </Text>
                )}
                {far && (
                  <View style={[styles.warn, { backgroundColor: c.warningSoft }]} testID="checkin-far-warning">
                    <Text variant="caption">{t('checkin.farWarning', { distance: formatDistance(nearest?.meters) })}</Text>
                  </View>
                )}
              </View>
            )}
          </Card>

          <Button
            testID="checkin-submit"
            label={direction === 'entrance' ? t('checkin.arrive') : t('checkin.leave')}
            icon="check"
            size="lg"
            full
            loading={submitting}
            disabled={!photo || loc.kind !== 'ready'}
            onPress={() => void submit()}
          />
        </View>
      )}

      {hasEmployee && <History />}
    </Screen>
  );
}

function SuccessCard({
  done,
  place,
  direction,
  onClose,
}: {
  done: Done;
  place?: string | null;
  direction: CheckinDirection;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const time = dayjs(done.kind === 'sent' ? done.checkin.happen_time : done.at).format('HH:mm');
  const dist = done.kind === 'sent' ? formatDistance(done.checkin.distance_m) : null;
  return (
    <Card testID="checkin-success">
      <View style={styles.success}>
        <Tomchi mood="happy" size={96} />
        <Text variant="title" style={styles.center}>
          {t('checkin.successTitle')}
        </Text>
        <Text variant="body" tone="muted" style={styles.center}>
          {[time, t(`checkin.dir_${direction}`), place, dist].filter(Boolean).join(' · ')}
        </Text>
        {done.kind === 'queued' && (
          <Badge label={t('checkin.pending', { count: 1 })} tone="warning" />
        )}
        {done.kind === 'sent' && done.checkin.is_far && <Badge label={t('checkin.far')} tone="warning" />}
        <Button label={t('checkin.done')} full onPress={onClose} />
      </View>
    </Card>
  );
}

/** Oxirgi 30 kun belgilari — sahifalab, server tartibida (yangisi tepada). */
function History() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<number | null>(null);
  const to = dayjs().format('YYYY-MM-DD');
  const from = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  const q = useQuery(myCheckinsQuery({ dateFrom: from, dateTo: to, page }));
  return (
    <Card title={t('checkin.history')} icon="clock" tint="violet" style={styles.history} testID="checkin-history">
      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <Skeleton height={120} />
      ) : !q.data.items.length ? (
        <Text variant="body" tone="muted">
          {t('checkin.historyEmpty')}
        </Text>
      ) : (
        // Qator bosilsa — to'liq tafsilot (bekor qilish sababi kesilmaydi, joy, masofa, xarita).
        q.data.items.map((r) => <CheckinRow key={r.id} item={r} onPress={() => setViewing(r.id)} />)
      )}
      <Pager page={page} pages={q.data?.pages ?? 1} onPage={setPage} />
      {viewing !== null && <CheckinDetailSheet key={viewing} id={viewing} onClose={() => setViewing(null)} />}
    </Card>
  );
}

export function CheckinRow({ item, onPress, showName }: { item: MobileCheckin; onPress?: () => void; showName?: boolean }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const at = dayjs(item.happen_time);
  const isToday = at.isSame(dayjs(), 'day');
  const cancelled = item.status === 'cancelled';
  const thumb = item.photo_thumb_path || item.photo_path;
  const body = (
    <View style={[styles.item, { borderColor: c.border }]} testID={`checkin-row-${item.id}`}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, { backgroundColor: c.skeleton }]} />
      )}
      <View style={styles.flex}>
        {/* Kadr ro'yxatida ism — alohida sarlavha (vaqt bilan bir qatorda kesilib qolardi). */}
        {showName && !!item.employee?.legal_name && (
          <Text variant="label" numberOfLines={1}>
            {item.employee.legal_name}
          </Text>
        )}
        <Text
          variant={showName ? 'caption' : 'label'}
          numberOfLines={1}
          style={cancelled ? styles.struck : undefined}
        >
          {`${isToday ? t('checkin.today') : at.format('DD.MM')} ${at.format('HH:mm')} · ${t(`checkin.dir_${item.direction_type}`, { defaultValue: item.direction_type })}`}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {[checkinPlace(item), formatDistance(item.distance_m)].filter(Boolean).join(' · ')}
          {cancelled && item.cancel_reason ? `\n${t('checkin.cancelReasonLabel')}: ${item.cancel_reason}` : ''}
        </Text>
      </View>
      <View style={styles.badges}>
        {cancelled ? (
          <Badge label={t('checkin.statusCancelled')} tone="danger" />
        ) : item.is_far ? (
          <Badge label={t('checkin.far')} tone="warning" />
        ) : (
          <Badge label={t('checkin.statusActive')} tone="success" />
        )}
      </View>
      {!!onPress && <Icon name="chevronRight" size={16} color={c.textMuted} />}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  ) : (
    body
  );
}

const styles = StyleSheet.create({
  flow: { gap: 12 },
  gap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  shoot: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  photoWrap: { gap: 10 },
  // Ixcham — yuborish tugmasi telefon ekranidan tushib ketmasin.
  photo: { width: '100%', height: 220, borderRadius: radii.lg },
  warn: { padding: 10, borderRadius: radii.md },
  success: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  history: { marginTop: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  struck: { textDecorationLine: 'line-through' },
  badges: { alignItems: 'flex-end' },
});
