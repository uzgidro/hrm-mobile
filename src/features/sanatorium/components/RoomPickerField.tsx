// Room picker with photo cards: a field that opens a sheet listing rooms (cover thumbnail,
// number, free beds, price) — tapping the cover opens the gallery, tapping the card selects it.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Button, EmptyState, LoadingView, SelectField, Sheet, Text } from '@/ui';
import type { RoomPhoto } from '../types';
import { RoomCover } from './RoomCover';
import { RoomGallery, type GalleryState } from './RoomGallery';

export type RoomOption = {
  id: number;
  title: string;
  /** «free beds 2/3 · 250 000 / bed» — whatever the caller wants under the title. */
  sub?: string;
  photos?: RoomPhoto[];
};

export function RoomPickerField({
  label,
  value,
  options,
  onChange,
  noneLabel,
  placeholder,
  loading,
  testID,
}: {
  label: string;
  value: number | null;
  options: RoomOption[];
  onChange: (id: number | null) => void;
  /** Adds a «no preference» row that clears the value. */
  noneLabel?: string;
  placeholder?: string;
  loading?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  const [gallery, setGallery] = useState<GalleryState>(null);
  const picked = options.find((o) => o.id === value);
  return (
    <>
      <SelectField label={label} value={picked ? picked.title : noneLabel && value == null ? noneLabel : undefined} placeholder={placeholder} onPress={() => setOpen(true)} testID={testID} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} scroll>
        <View style={styles.list} testID="room-picker">
          {noneLabel && <Button label={noneLabel} variant="soft" full onPress={() => { onChange(null); setOpen(false); }} testID="room-none" />}
          {loading && <LoadingView rows={2} />}
          {!loading && options.length === 0 && <EmptyState title={t('sanatorium.noFreeRooms')} />}
          {options.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => { onChange(o.id); setOpen(false); }}
              accessibilityRole="button"
              testID={`room-opt-${o.id}`}
              style={[styles.card, { backgroundColor: c.surface, borderColor: o.id === value ? c.brand : c.border }]}
            >
              <RoomCover photos={o.photos} size={72} onOpen={() => setGallery({ title: o.title, photos: o.photos ?? [], index: 0 })} testID={`room-cover-${o.id}`} />
              <View style={styles.flex}>
                <Text variant="heading" numberOfLines={1}>{o.title}</Text>
                {!!o.sub && <Text variant="caption" tone="muted">{o.sub}</Text>}
                {(o.photos?.length ?? 0) > 0 && <Text variant="caption" tone="link" onPress={() => setGallery({ title: o.title, photos: o.photos!, index: 0 })}>{t('sanatorium.photos')} ({o.photos!.length})</Text>}
              </View>
            </Pressable>
          ))}
        </View>
      </Sheet>
      <RoomGallery state={gallery} onClose={() => setGallery(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: 8 },
  flex: { flex: 1 },
  card: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: radii.lg, borderWidth: 1.5, alignItems: 'center' },
});
