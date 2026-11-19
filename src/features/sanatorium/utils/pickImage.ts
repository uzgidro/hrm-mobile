// One image from the library, downscaled like the room photos, ready for a multipart upload.
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { UploadFile } from '@/api/formFile';
import { ensureMediaLibraryAccess } from '@/lib/mediaLibraryAccess';
import { PHOTO_UPLOAD_QUALITY, downscaleAction } from './roomPhotos';

export type PickResult = { file: UploadFile } | { denied: true } | null;

/** `null` = cancelled, `{denied}` = no media permission. The server re-encodes, we only cap the size. */
export async function pickImage(): Promise<PickResult> {
  if (!(await ensureMediaLibraryAccess())) return { denied: true };
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0]!;
  const out = await ImageManipulator.manipulateAsync(a.uri, downscaleAction(a.width, a.height), {
    compress: PHOTO_UPLOAD_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const base = (a.fileName || 'photo').replace(/\.[^.]+$/, '') || 'photo';
  return { file: { uri: out.uri, name: `${base}.jpg`, mimeType: 'image/jpeg' } };
}
