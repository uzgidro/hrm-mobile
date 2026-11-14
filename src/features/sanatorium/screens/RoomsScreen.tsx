// Registrar's rooms: capacity, price, a 14-day occupancy strip per room and create / edit.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, EmptyState, PageHeader, Screen, Sheet, Text } from '@/ui';
import { toneColors } from '@/ui/Chip';
import { useSaveRoom } from '../api/mutations';
import { availabilityQuery, roomsQuery } from '../api/queries';
import { ChoiceField, ErrorLine, opt, optNull, SwitchRow } from '../components/forms';
import { Denied, QueryBlock, useSanAccess } from '../components/common';
import type { AvailabilityRoom, PriceMode, Room } from '../types';
import { addDays, sanErrorMessage, todayIso } from '../utils/sanatorium';

const DAYS = 14;

export default function RoomsScreen() {
  const { t } = useTranslation();
  const allowed = useSanAccess('registrar');
  const start = todayIso();
  const rooms = useQuery(roomsQuery(allowed));
  const avail = useQuery(availabilityQuery(start, DAYS, allowed));
  const [edit, setEdit] = useState<Room | 'new' | null>(null);
  if (!allowed) return <Denied />;
  const byId = new Map((avail.data?.rooms ?? []).map((r) => [r.id, r]));
  return (
    <Screen
      refreshing={rooms.isRefetching}
      onRefresh={() => {
        void rooms.refetch();
        void avail.refetch();
      }}
      testID="sanatorium-rooms-screen"
    >
      <PageHeader title={t('sanatorium.nav.rooms')} right={<Button testID="room-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setEdit('new')} />} />
      <QueryBlock query={rooms}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState title={t('sanatorium.noRooms')} />
          ) : (
            <View style={styles.stack}>
              {items.map((r) => (
                <RoomCard key={r.id} room={r} occ={byId.get(r.id)} start={start} onEdit={() => setEdit(r)} />
              ))}
            </View>
          )
        }
      </QueryBlock>
      <RoomSheet room={edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}

function RoomCard({ room, occ, start, onEdit }: { room: Room; occ?: AvailabilityRoom; start: string; onEdit: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const price = room.price_per_day ? `${Number(room.price_per_day).toLocaleString('ru-RU')} / ${t(room.price_mode === 'per_room' ? 'sanatorium.perRoom' : 'sanatorium.perBed')}` : null;
  return (
    <Card testID={`room-${room.id}`}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text variant="heading">{t('sanatorium.room')} {room.number}</Text>
          <Text variant="caption" tone="muted">
            {[room.building, room.floor != null ? `${room.floor}-${t('sanatorium.floor')}` : null, room.room_type, `${room.capacity} ${t('sanatorium.beds')}`].filter(Boolean).join(' · ')}
          </Text>
          {!!price && <Text variant="caption" tone="muted">{price}</Text>}
        </View>
        {!room.is_active ? <Badge label={t('sanatorium.inactive')} tone="neutral" /> : room.out_of_service ? <Badge label={t('sanatorium.outOfService')} tone="danger" /> : null}
        <Button label={t('sanatorium.edit')} variant="soft" size="sm" icon="edit" onPress={onEdit} testID="room-edit" />
      </View>
      {occ && !room.out_of_service && (
        <View style={styles.strip} testID={`strip-${room.id}`}>
          {occ.occupancy.map((n, i) => {
            const tone = n >= room.capacity ? 'danger' : n > 0 ? 'warning' : 'success';
            const col = toneColors(c, tone);
            return (
              <View key={i} style={[styles.cell, { backgroundColor: col.soft }]}>
                <Text variant="caption" style={{ color: col.fg, fontSize: 10, lineHeight: 12 }}>{addDays(start, i).slice(8)}</Text>
                <Text variant="caption" weight="700" style={{ color: col.fg }}>{n}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

function RoomSheet({ room, onClose }: { room: Room | 'new' | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!room} onClose={onClose} title={room === 'new' ? t('sanatorium.addRoom') : t('sanatorium.editRoom')} scroll>
      {room && <RoomForm key={room === 'new' ? 'new' : room.id} room={room === 'new' ? null : room} onClose={onClose} />}
    </Sheet>
  );
}

function RoomForm({ room, onClose }: { room: Room | null; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveRoom();
  const [number, setNumber] = useState(room?.number ?? '');
  const [building, setBuilding] = useState(room?.building ?? '');
  const [floor, setFloor] = useState(room?.floor != null ? String(room.floor) : '');
  const [type, setType] = useState(room?.room_type ?? '');
  const [capacity, setCapacity] = useState(String(room?.capacity ?? 2));
  const [price, setPrice] = useState(room?.price_per_day ? String(Number(room.price_per_day)) : '0');
  const [mode, setMode] = useState<PriceMode>(room?.price_mode ?? 'per_bed');
  const [desc, setDesc] = useState(room?.description ?? '');
  const [oos, setOos] = useState(room?.out_of_service ?? false);
  const [oosNote, setOosNote] = useState(room?.out_of_service_note ?? '');
  const [active, setActive] = useState(room?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const cap = Number.parseInt(capacity, 10);
    const fl = floor.trim() ? Number.parseInt(floor, 10) : null;
    const pr = Number(price.replace(',', '.'));
    if (!number.trim()) return setError(t('sanatorium.numberRequired'));
    if (!Number.isFinite(cap) || cap < 1 || cap > 50) return setError(t('sanatorium.capacityRange'));
    if (!Number.isFinite(pr) || pr < 0) return setError(t('sanatorium.priceInvalid'));
    try {
      await save.mutateAsync({
        id: room?.id,
        body: {
          number: number.trim(),
          building: optNull(building),
          floor: fl,
          room_type: optNull(type),
          capacity: cap,
          price_per_day: pr.toFixed(2),
          price_mode: mode,
          description: optNull(desc),
          out_of_service: oos,
          out_of_service_note: oos ? opt(oosNote) ?? null : null,
          is_active: active,
        },
      });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form} testID="room-sheet">
      <FormInput label={t('sanatorium.roomNumber')} value={number} onChangeText={setNumber} required testID="room-number" />
      <FormInput label={t('sanatorium.building')} value={building} onChangeText={setBuilding} />
      <FormInput label={t('sanatorium.floorLabel')} value={floor} onChangeText={setFloor} keyboardType="number-pad" />
      <FormInput label={t('sanatorium.roomType')} value={type} onChangeText={setType} />
      <FormInput label={t('sanatorium.capacity')} value={capacity} onChangeText={setCapacity} keyboardType="number-pad" required testID="room-capacity" />
      <FormInput label={t('sanatorium.pricePerDay')} value={price} onChangeText={setPrice} keyboardType="decimal-pad" testID="room-price" />
      <ChoiceField
        label={t('sanatorium.priceMode')}
        value={mode}
        options={[{ value: 'per_bed' as PriceMode, label: t('sanatorium.perBed') }, { value: 'per_room' as PriceMode, label: t('sanatorium.perRoom') }]}
        onChange={(v) => v && setMode(v)}
      />
      <FormInput label={t('sanatorium.description')} value={desc} onChangeText={setDesc} multiline />
      <SwitchRow label={t('sanatorium.outOfService')} value={oos} onChange={setOos} testID="room-oos" />
      {oos && <FormInput label={t('sanatorium.outOfServiceNote')} value={oosNote} onChangeText={setOosNote} />}
      <SwitchRow label={t('sanatorium.active')} value={active} onChange={setActive} />
      <ErrorLine message={error} testID="room-error" />
      <Button testID="room-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 10 },
  cell: { width: 22, borderRadius: 6, alignItems: 'center', paddingVertical: 2 },
  form: { gap: 2, paddingBottom: 8 },
});
