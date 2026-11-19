// Pure helpers for room photo upload: downscale plan and reorder maths.
import type { RoomPhoto } from '../types';

/** Long side we send (px) and JPEG quality. The server re-encodes to 1600 px anyway. */
export const PHOTO_UPLOAD_SIDE = 2000;
export const PHOTO_UPLOAD_QUALITY = 0.85;
export const MAX_ROOM_PHOTOS = 12;

/** Resize action only when the picture is larger than `max` on its long side (ratio kept). */
export function downscaleAction(width: number, height: number, max = PHOTO_UPLOAD_SIDE): { resize: { width: number } | { height: number } }[] {
  if (!width || !height || Math.max(width, height) <= max) return [];
  return [{ resize: width >= height ? { width: max } : { height: max } }];
}

/** Ids in the new order after moving photo `id` by `delta` places (clamped); same list when it cannot move. */
export function movedIds(photos: RoomPhoto[], id: number, delta: number): number[] {
  const ids = photos.map((p) => p.id);
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const to = Math.min(ids.length - 1, Math.max(0, from + delta));
  const [x] = ids.splice(from, 1);
  ids.splice(to, 0, x!);
  return ids;
}

/** «Make cover» = move the photo to the front. */
export const coverFirst = (photos: RoomPhoto[], id: number): number[] => movedIds(photos, id, -photos.length);
