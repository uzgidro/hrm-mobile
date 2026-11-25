// Room occupancy grid (web «Band holat»): rooms down, days across, used/capacity per cell. The room
// column stays put while the day columns scroll sideways. Tapping a room lists who lives there.
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DatePickerModal } from '@/components/DatePicker';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Badge, Button, Card, EmptyState, IconButton, ListRow, Segmented, Sheet, Text } from '@/ui';
import { toneColors } from '@/ui/Chip';
import { availabilityQuery } from '../api/queries';
import type { AvailabilityRoom } from '../types';
import { cellTone, type CellTone } from '../utils/guests';
import { addDays, fmtDate, stayTone, todayIso } from '../utils/sanatorium';
import { QueryBlock } from './common';
import { RoomCover } from './RoomCover';
import { RoomGallery, type GalleryState } from './RoomGallery';

const CELL_W = 40;
const ROW_H = 54;
const NAME_W = 132;
const FREE_W = 96;

function cellColors(tone: CellTone, c: ThemeColors): { bg: string; fg: string } {
  if (tone === 'full') return { bg: c.danger, fg: c.fgOnBrand };
  if (tone === 'oos') return { bg: c.surface2, fg: c.fgSubtle };
  const k = toneColors(c, tone === 'partial' ? 'brand' : 'success');
  return { bg: k.soft, fg: k.fg };
}

export function OccupancyGrid() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [start, setStart] = useState(todayIso());
  const [days, setDays] = useState<'14' | '30'>('14');
  const n = Number(days);
  const [picker, setPicker] = useState(false);
  const q = useQuery(availabilityQuery(start, n, true));
  const [open, setOpen] = useState<number | null>(null);
  const [gallery, setGallery] = useState<GalleryState>(null);
  const dates = useMemo(() => Array.from({ length: n }, (_, i) => addDays(start, i)), [start, n]);
  const today = todayIso();
  const rooms = (q.data?.rooms ?? []).filter((r) => r.is_active !== false);
  const openRoom = open != null ? rooms.find((r) => r.id === open) ?? null : null;

  return (
    <View testID="occupancy-grid">
      <View style={styles.controls}>
        <IconButton testID="grid-prev" icon="chevronLeft" tone="soft" accessibilityLabel={t('sanGuests.prevPeriod')} onPress={() => setStart(addDays(start, -n))} />
        <Pressable onPress={() => setPicker(true)} style={styles.dateBtn} accessibilityRole="button" testID="grid-date">
          <Icon name="calendar" size={16} color={c.fgMuted} />
          <Text variant="heading">{fmtDate(start)}</Text>
        </Pressable>
        <IconButton testID="grid-next" icon="chevronRight" tone="soft" accessibilityLabel={t('sanGuests.nextPeriod')} onPress={() => setStart(addDays(start, n))} />
        <Button testID="grid-today" label={t('sanatorium.today')} variant="link" size="sm" onPress={() => setStart(today)} />
      </View>
      <Segmented
        testID="grid-days"
        value={days}
        onChange={setDays}
        options={[{ value: '14', label: t('sanGuests.days14') }, { value: '30', label: t('sanGuests.days30') }]}
      />
      <View style={styles.legend} testID="grid-legend">
        {(['free', 'partial', 'full', 'oos'] as const).map((k) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: cellColors(k, c).bg, borderColor: c.border }]} />
            <Text variant="caption" tone="muted">{t(`sanGuests.legend.${k}`)}</Text>
          </View>
        ))}
      </View>
      <QueryBlock query={q}>
        {() =>
          rooms.length === 0 ? (
            <EmptyState title={t('sanatorium.noRooms')} />
          ) : (
            <Card>
              <View style={styles.table}>
                <View style={[styles.nameCol, { borderRightColor: c.border }]}>
                  <View style={[styles.headCell, { borderBottomColor: c.border }]}>
                    <Text variant="caption" tone="muted" weight="600">{t('sanatorium.room')}</Text>
                  </View>
                  {rooms.map((r) => (
                    <Pressable key={r.id} onPress={() => setOpen(r.id)} style={[styles.nameCell, { borderBottomColor: c.border }]} accessibilityRole="button" testID={`grid-room-${r.id}`}>
                      <RoomCover photos={r.photos} size={32} onOpen={() => setGallery({ title: `${t('sanatorium.room')} ${r.number}`, photos: r.photos ?? [], index: 0 })} testID={`grid-cover-${r.id}`} />
                      <View style={styles.flex}>
                        <Text variant="label" weight="700" numberOfLines={1}>{r.number}{r.building ? ` · ${r.building}` : ''}</Text>
                        <Text variant="caption" tone="subtle" numberOfLines={1}>{[r.room_type, r.capacity].filter(Boolean).join(' · ')}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator testID="grid-scroll">
                  <View>
                    <View style={styles.rowLine}>
                      {dates.map((d) => {
                        const wk = dayjs(d).day() % 6 === 0;
                        return (
                          <View key={d} style={[styles.headCell, styles.dayHead, { borderBottomColor: c.border }]}>
                            <Text variant="caption" weight="700" style={{ color: d === today ? c.brandStrong : wk ? c.danger : c.fgMuted }}>{dayjs(d).format('DD')}</Text>
                            <Text variant="caption" tone="subtle" style={styles.month}>{dayjs(d).format('MM')}</Text>
                          </View>
                        );
                      })}
                      <View style={[styles.headCell, styles.freeHead, { borderBottomColor: c.border }]}>
                        <Text variant="caption" tone="muted" weight="600">{t('sanatorium.freeFrom')}</Text>
                      </View>
                    </View>
                    {rooms.map((r) => (
                      <View key={r.id} style={styles.rowLine} testID={`grid-row-${r.id}`}>
                        {dates.map((d, i) => (
                          <GridCell key={d} room={r} used={r.occupancy[i] ?? 0} onPress={() => setOpen(r.id)} />
                        ))}
                        <View style={[styles.freeCell, { borderBottomColor: c.border }]}>
                          {r.out_of_service ? (
                            <Badge label={t('sanatorium.outOfService')} tone="neutral" />
                          ) : r.free_from ? (
                            <Text variant="caption" tone="muted">{fmtDate(r.free_from)}</Text>
                          ) : (
                            <Text variant="caption" tone="success" weight="600" testID={`grid-free-${r.id}`}>{t('sanGuests.freeNow')}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </Card>
          )
        }
      </QueryBlock>
      <Sheet visible={!!openRoom} onClose={() => setOpen(null)} title={openRoom ? `${t('sanatorium.room')} ${openRoom.number}` : ''} scroll>
        {openRoom && <Occupants room={openRoom} onOpen={(id) => { setOpen(null); router.push({ pathname: '/sanatorium-stay', params: { id: String(id) } }); }} />}
      </Sheet>
      <DatePickerModal visible={picker} value={start} title={t('sanatorium.pickDate')} onConfirm={(v) => v && setStart(v)} onClose={() => setPicker(false)} />
      <RoomGallery state={gallery} onClose={() => setGallery(null)} />
    </View>
  );
}

function GridCell({ room, used, onPress }: { room: AvailabilityRoom; used: number; onPress: () => void }) {
  const { colors: c } = useTheme();
  const tone = cellTone(used, room.capacity, room.out_of_service);
  const col = cellColors(tone, c);
  return (
    <Pressable onPress={onPress} style={[styles.cellWrap, { borderBottomColor: c.border }]} accessibilityLabel={`${used}/${room.capacity}`}>
      <View style={[styles.cell, { backgroundColor: col.bg }]} testID={`cell-${room.id}-${tone}`}>
        <Text variant="caption" weight="700" style={{ color: col.fg, fontSize: 11 }}>{room.out_of_service ? '–' : `${used}/${room.capacity}`}</Text>
      </View>
    </Pressable>
  );
}

function Occupants({ room, onOpen }: { room: AvailabilityRoom; onOpen: (stayId: number) => void }) {
  const { t } = useTranslation();
  return (
    <View testID="room-occupants">
      <Text variant="caption" tone="muted">{t('sanGuests.roomStays', { used: room.used_today, cap: room.capacity })}</Text>
      {room.out_of_service && (
        <Text variant="label" tone="danger" testID="room-oos-note">{[t('sanatorium.outOfService'), room.out_of_service_note].filter(Boolean).join(': ')}</Text>
      )}
      {room.stays.length === 0 ? (
        <Text variant="body" tone="muted" testID="room-no-occupants">{t('sanGuests.noOccupants')}</Text>
      ) : (
        room.stays.map((s) => (
          <ListRow
            key={s.stay_id}
            testID={`occupant-${s.stay_id}`}
            title={s.guest.full_name}
            subtitle={`${fmtDate(s.planned_from)} → ${fmtDate(s.planned_to)}`}
            right={<Badge label={t(`sanatorium.stayStatus.${s.status}`)} tone={stayTone(s.status)} />}
            chevron
            onPress={() => onOpen(s.stay_id)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingVertical: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },
  table: { flexDirection: 'row' },
  nameCol: { width: NAME_W, borderRightWidth: 1 },
  headCell: { height: 40, justifyContent: 'center', paddingHorizontal: 8, borderBottomWidth: 1 },
  nameCell: { height: ROW_H, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, borderBottomWidth: 1 },
  rowLine: { flexDirection: 'row' },
  dayHead: { width: CELL_W, alignItems: 'center', paddingHorizontal: 0 },
  month: { fontSize: 9, lineHeight: 11 },
  freeHead: { width: FREE_W },
  cellWrap: { width: CELL_W, height: ROW_H, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1 },
  cell: { width: CELL_W - 4, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  freeCell: { width: FREE_W, height: ROW_H, justifyContent: 'center', paddingHorizontal: 8, borderBottomWidth: 1 },
});
