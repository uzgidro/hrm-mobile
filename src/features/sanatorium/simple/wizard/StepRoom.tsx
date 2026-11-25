// «Qachongacha va qaysi xonada?»: dates, quick nights and the rooms that really fit the whole party.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip, ErrorState, LoadingView, Text } from '@/ui';
import { roomsQuery } from '../../api/queries';
import { DateField } from '../../components/forms';
import { RoomCover } from '../../components/RoomCover';
import { RoomGallery, type GalleryState } from '../../components/RoomGallery';
import { useSanFeatures } from '../../utils/features';
import { fmtMoney, todayIso } from '../../utils/sanatorium';
import { ChoiceCard, Note, useRoomText, type ChoiceBadge } from '../components/parts';
import type { ArrivalOptions, OptionRoom } from '../types';
import { nightsOf, plusDays, type Derived, type WizState } from './state';
import type { StepSet } from './StepWho';

const FIRST = 6;
const NIGHTS = [1, 3, 7, 10, 14, 21];

export function StepRoom({
  s, set, o, d, loading, failed, onRetry, preferredId,
}: { s: WizState; set: StepSet; o?: ArrivalOptions; d: Derived; loading: boolean; failed: boolean; onRetry: () => void; preferredId?: number }) {
  const { t } = useTranslation();
  const features = useSanFeatures();
  const roomText = useRoomText();
  const [all, setAll] = useState(false);
  const [gallery, setGallery] = useState<GalleryState>(null);
  const rooms = useQuery(roomsQuery());
  const photosOf = (id: number) => rooms.data?.find((r) => r.id === id)?.photos ?? [];
  const nights = nightsOf(s.start, s.end);
  const people = s.members.length;
  // A family in several rooms: a room that holds only some of them is not a choice for everybody.
  const split = d.keepsRooms || !!o?.rooms_assigned ? (o?.rooms ?? []).filter((r) => r.own).length > 1 : false;
  const takes = (r: OptionRoom) => r.fits !== false && (!r.own || r.own >= people || r.free_beds >= people);
  const list0 = o?.rooms ?? [];
  const fit = list0.filter(takes);
  const others = list0.filter((r) => !takes(r));
  // The chosen room stays on top of the short list even when the server ranks it lower.
  const picked = list0.find((r) => r.id === d.roomId);
  const short = fit.slice(0, FIRST);
  const list = all ? [...fit, ...others] : picked && !short.includes(picked) ? [picked, ...short.slice(0, FIRST - 1)] : short;
  const lost = d.lostRoom || (s.roomId != null && !!o && d.roomId === null);
  const preferred = preferredId ? list0.find((r) => r.id === preferredId) : undefined;

  const setStart = (v: string) => {
    // A walk-in or a request never starts in the past.
    const from = s.source !== 'stay' && v < todayIso() ? todayIso() : v;
    set({ start: from, end: s.end > from ? s.end : plusDays(from, Math.max(1, nights)), examAt: {} });
  };
  const setEnd = (v: string) => set({ end: v > s.start ? v : plusDays(s.start, 1) });

  const card = (r: OptionRoom) => {
    const photos = photosOf(r.id);
    const badges: ChoiceBadge[] = [];
    if (o?.suggested_room_id === r.id) badges.push({ label: t('sanFlow.room.suggested'), tone: 'success' });
    if (preferredId === r.id) badges.push({ label: t('sanFlow.room.guestChoice'), tone: 'brand' });
    if (r.own) badges.push({ label: t('sanFlow.room.booked'), tone: 'brand' });
    if (r.held && preferredId !== r.id) badges.push({ label: t('sanFlow.room.held') });
    if (r.ready === false && r.fits !== false && features.on('housekeeping')) badges.push({ label: t('sanFlow.room.notReady'), tone: 'warning' });
    const usable = takes(r) || d.roomId === r.id;
    return (
      <ChoiceCard
        key={r.id} on={d.roomId === r.id} disabled={!usable} testID={`room-${r.number}`} icon="building" onPress={() => set({ roomId: r.id })} title={roomText(r)} badges={badges}
        left={photos.length > 0 ? <RoomCover photos={photos} size={64} onOpen={() => setGallery({ title: roomText(r), photos, index: 0 })} testID={`room-cover-${r.id}`} /> : undefined}
        hint={[
          r.room_type, t(usable ? 'sanFlow.room.freeBeds' : 'sanFlow.room.full', { free: r.free_beds, cap: r.capacity }),
          r.price_per_day ? `${fmtMoney(r.price_per_day)} ${t(r.price_mode === 'per_room' ? 'sanFlow.room.perRoom' : 'sanFlow.room.perBed')}` : null,
        ].filter(Boolean).join(' · ')}
        extra={placeOnly(r)}
      />
    );
  };

  return (
    <View style={styles.stack}>
      <DateField label={t('sanatorium.dateFrom')} value={s.start} onChange={setStart} testID="wiz-start" />
      <DateField label={t('sanatorium.dateTo')} value={s.end} onChange={setEnd} testID="wiz-end" />
      <Text variant="label" tone="muted" testID="wiz-nights">{t('sanFlow.room.howLong')} {t('sanFlow.common.nightsN', { n: nights })}</Text>
      <View style={styles.wrap}>
        {NIGHTS.map((n) => <Chip key={n} label={t('sanFlow.common.nightsN', { n })} selected={nights === n} onPress={() => set({ end: plusDays(s.start, n) })} testID={`nights-${n}`} />)}
      </View>
      {!!preferred && preferred.fits === false && <Note tone="warning" testID="room-preferred-full">{t('sanFlow.room.preferredFull', { room: preferred.number })}</Note>}
      {lost && !(preferred && preferred.fits === false) && <Note tone="warning" testID="room-lost">{t(d.lostRoom && d.roomId ? 'sanFlow.room.lostOther' : 'sanFlow.room.lost')}</Note>}
      {failed ? (
        <ErrorState onRetry={onRetry} />
      ) : loading && !o ? (
        <LoadingView rows={3} />
      ) : (
        <>
          {split && (
            <ChoiceCard
              on={d.keepsRooms} icon="users" title={t('sanFlow.room.keepOwn')} testID="keep-rooms" onPress={() => set({ roomId: undefined })}
              hint={s.members.map((m) => `${m.full_name} — ${m.room_number ? t('sanFlow.common.roomN', { n: m.room_number }) : '—'}`).join(', ')}
            />
          )}
          {fit.length === 0 && !picked && !d.keepsRooms && <Note tone="danger" testID="room-none">{t('sanFlow.room.none')}</Note>}
          <View style={styles.stack} accessibilityRole="radiogroup" testID="room-list">{list.map(card)}</View>
          {!all && (fit.length > list.length || others.length > 0) && (
            <Button label={t('sanFlow.room.showAll', { n: list0.length })} variant="ghost" onPress={() => setAll(true)} testID="room-all" />
          )}
          <Button label={t(s.roomId === null ? 'sanFlow.room.chooseNow' : 'sanFlow.room.later')} variant={s.roomId === null ? 'soft' : 'ghost'} onPress={() => set({ roomId: s.roomId === null ? undefined : null })} testID="room-later" />
          {s.roomId === null && <Note tone="info">{t('sanFlow.room.laterHint')}</Note>}
        </>
      )}
      <RoomGallery state={gallery} onClose={() => setGallery(null)} />
    </View>
  );
}

/** The server's «building, floor» is already in the title: only the place on the plan is left. */
export function placeOnly(r: Pick<OptionRoom, 'place' | 'building' | 'floor'>): string | null {
  if (!r.place) return null;
  const prefix = [r.building, r.floor != null ? `${r.floor}-qavat` : null].filter(Boolean).join(', ');
  return (prefix && r.place.startsWith(prefix) ? r.place.slice(prefix.length).replace(/^, /, '') : r.place) || null;
}

const styles = StyleSheet.create({ stack: { gap: 10 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
