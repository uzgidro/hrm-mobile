// Photo management of one room (registrar): pick several images, downscale, upload them one by
// one with progress and per-file errors, thumbnail grid, make cover / reorder / delete.
// The photo list is read from the rooms query so every change shows up straight away.
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { confirm } from '@/lib/confirm';
import { ensureMediaLibraryAccess } from '@/lib/mediaLibraryAccess';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Badge, Button, ProgressBar, Text } from '@/ui';
import { useDeleteRoomPhoto, useReorderRoomPhotos, useUploadRoomPhoto } from '../api/mutations';
import { roomsQuery } from '../api/queries';
import type { RoomPhoto } from '../types';
import { MAX_ROOM_PHOTOS, PHOTO_UPLOAD_QUALITY, coverFirst, downscaleAction, movedIds } from '../utils/roomPhotos';
import { sanErrorMessage } from '../utils/sanatorium';
import { RoomGallery, type GalleryState } from './RoomGallery';

type Job = { key: string; name: string; status: 'queued' | 'uploading' | 'done' | 'error'; error?: string };

export function RoomPhotoManager({ roomId, title }: { roomId: number; title: string }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const rooms = useQuery(roomsQuery());
  const photos: RoomPhoto[] = rooms.data?.find((r) => r.id === roomId)?.photos ?? [];
  const upload = useUploadRoomPhoto();
  const del = useDeleteRoomPhoto();
  const reorder = useReorderRoomPhotos();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [gallery, setGallery] = useState<GalleryState>(null);
  const busy = jobs.some((j) => j.status === 'queued' || j.status === 'uploading');
  const left = MAX_ROOM_PHOTOS - photos.length;

  const patchJob = (key: string, p: Partial<Job>) => setJobs((l) => l.map((j) => (j.key === key ? { ...j, ...p } : j)));

  const pick = async () => {
    if (left <= 0) return toast.error(t('sanatorium.errors.too_many_photos', { max: MAX_ROOM_PHOTOS }));
    if (!(await ensureMediaLibraryAccess())) return toast.error(t('sanatorium.photoPermission'));
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: left, quality: 1 });
    if (res.canceled || !res.assets?.length) return;
    const assets = res.assets.slice(0, left);
    const queue: Job[] = assets.map((a, i) => ({ key: `${Date.now()}-${i}`, name: a.fileName || `photo-${i + 1}.jpg`, status: 'queued' }));
    setJobs(queue);
    // One request per image, strictly in sequence: a bad file must not stop the others.
    for (let i = 0; i < assets.length; i++) {
      const a = assets[i]!;
      const job = queue[i]!;
      patchJob(job.key, { status: 'uploading' });
      try {
        const out = await ImageManipulator.manipulateAsync(a.uri, downscaleAction(a.width, a.height), { compress: PHOTO_UPLOAD_QUALITY, format: ImageManipulator.SaveFormat.JPEG });
        const name = `${(job.name.replace(/\.[^.]+$/, '') || 'photo')}.jpg`;
        await upload.mutateAsync({ roomId, uri: out.uri, name, mimeType: 'image/jpeg' });
        patchJob(job.key, { status: 'done' });
      } catch (e) {
        patchJob(job.key, { status: 'error', error: sanErrorMessage(e, t('errors.generic')) });
      }
    }
  };

  const onError = (e: unknown) => toast.error(sanErrorMessage(e, t('errors.generic')));
  const remove = async (p: RoomPhoto) => {
    const ok = await confirm({ title: t('sanatorium.deletePhoto'), confirmLabel: t('sanatorium.remove'), cancelLabel: t('common.cancel'), destructive: true });
    if (ok) del.mutate({ roomId, photoId: p.id }, { onError });
  };
  const move = (p: RoomPhoto, delta: number) => reorder.mutate({ roomId, ids: movedIds(photos, p.id, delta) }, { onError });
  const makeCover = (p: RoomPhoto) => reorder.mutate({ roomId, ids: coverFirst(photos, p.id) }, { onError });

  const done = jobs.filter((j) => j.status === 'done' || j.status === 'error').length;
  return (
    <View style={styles.wrap} testID="photo-manager">
      <View style={styles.head}>
        <Text variant="label" tone="muted" style={styles.flex}>{t('sanatorium.photos')} ({photos.length}/{MAX_ROOM_PHOTOS})</Text>
        <Button testID="photo-add" label={t('sanatorium.addPhotos')} icon="plus" size="sm" variant="soft" loading={busy} disabled={left <= 0} onPress={() => void pick()} />
      </View>
      {Platform.OS === 'web' && <Text variant="caption" tone="subtle">{t('sanatorium.photoWebHint')}</Text>}

      {jobs.length > 0 && (
        <View style={styles.jobs} testID="photo-jobs">
          {busy && (
            <>
              <ProgressBar value={jobs.length ? done / jobs.length : 0} />
              <Text variant="caption" tone="muted">{t('sanatorium.uploading')} {done}/{jobs.length}</Text>
            </>
          )}
          {jobs.filter((j) => j.status === 'error').map((j) => (
            <Text key={j.key} variant="caption" tone="danger" testID="photo-error">{j.name}: {j.error}</Text>
          ))}
        </View>
      )}

      {photos.length === 0 ? (
        <Text variant="body" tone="muted">{t('sanatorium.noPhotos')}</Text>
      ) : (
        <View style={styles.grid}>
          {photos.map((p, i) => (
            <View key={p.id} style={[styles.cell, { backgroundColor: c.surface2, borderColor: i === 0 ? c.brand : c.border }]} testID={`photo-${p.id}`}>
              <Pressable testID={`photo-open-${p.id}`} onPress={() => setGallery({ title, photos, index: i })} accessibilityRole="imagebutton" accessibilityLabel={`${t('sanatorium.photos')} ${i + 1}`}>
                <Image source={{ uri: p.thumb_url }} style={styles.thumb} contentFit="cover" />
              </Pressable>
              {i === 0 && <View style={styles.cover}><Badge label={t('sanatorium.cover')} tone="brand" /></View>}
              <View style={styles.tools}>
                <ToolBtn icon="chevronLeft" label={t('sanatorium.moveLeft')} disabled={i === 0} onPress={() => move(p, -1)} testID={`photo-left-${p.id}`} />
                <ToolBtn icon="check" label={t('sanatorium.makeCover')} disabled={i === 0} onPress={() => makeCover(p)} testID={`photo-cover-${p.id}`} />
                <ToolBtn icon="chevronRight" label={t('sanatorium.moveRight')} disabled={i === photos.length - 1} onPress={() => move(p, 1)} testID={`photo-right-${p.id}`} />
                <ToolBtn icon="trash" label={t('sanatorium.deletePhoto')} danger onPress={() => void remove(p)} testID={`photo-del-${p.id}`} />
              </View>
            </View>
          ))}
        </View>
      )}
      <RoomGallery state={gallery} onClose={() => setGallery(null)} />
    </View>
  );
}

function ToolBtn({ icon, label, onPress, disabled, danger, testID }: { icon: 'chevronLeft' | 'chevronRight' | 'check' | 'trash'; label: string; onPress: () => void; disabled?: boolean; danger?: boolean; testID?: string }) {
  const { colors: c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} testID={testID} style={[styles.tool, disabled && styles.off]}>
      <Icon name={icon} size={16} color={danger ? c.danger : c.fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginVertical: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  jobs: { gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48%', borderRadius: radii.md, borderWidth: 1.5, overflow: 'hidden' },
  thumb: { width: '100%', aspectRatio: 4 / 3 },
  cover: { position: 'absolute', top: 6, left: 6 },
  tools: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 },
  tool: { padding: 6 },
  off: { opacity: 0.3 },
});
