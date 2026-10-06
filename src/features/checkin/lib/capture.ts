// «Keldim» belgisi uchun surat va joylashuv. Ikkalasi ham FAQAT shu yerda olinadi —
// ekran natijani ko'rsatadi, xatoni (ruxsat yo'q / GPS o'chiq) tushunarli kod bilan oladi.
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';

/** Surat uzun tomoni (px) va JPEG sifati — server baribir 1600px/q85 ga qisqartiradi; mobil
 *  tarmoqda tez ketishi uchun undan ham kichik yuboramiz (~150–300 KB). */
export const PHOTO_MAX_SIDE = 1280;
export const PHOTO_QUALITY = 0.6;
/** GPS javobini kutish chegarasi — binoda signal sust bo'lsa oxirgi ma'lum nuqtaga tushamiz. */
export const LOCATION_TIMEOUT_MS = 20_000;

export type CapturedPhoto = { uri: string; base64: string; width: number; height: number };
export type CapturedLocation = { latitude: number; longitude: number; accuracy_m?: number; fromCache: boolean };

export class CaptureError extends Error {
  constructor(public code: 'camera_denied' | 'location_denied' | 'location_unavailable' | 'location_mocked' | 'photo_failed') {
    super(code);
  }
}

/** Kattaroq tomoni `max` dan oshsa — o'sha tomon bo'yicha kichraytirish (nisbat saqlanadi). */
export function resizeAction(width: number, height: number, max = PHOTO_MAX_SIDE): ImageManipulator.Action[] {
  if (!width || !height || Math.max(width, height) <= max) return [];
  return [{ resize: width >= height ? { width: max } : { height: max } }];
}

/**
 * Faqat KAMERA — galereyadan yuklash YO'Q (foydalanuvchi qarori 2026-10-06): belgi — shu yerda, hozir olingan surat. Old kamera standart
 * (yuz + fon), xodim tizim kamerasida almashtira oladi. `null` — foydalanuvchi bekor qildi.
 */
export async function takeCheckinPhoto(): Promise<CapturedPhoto | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new CaptureError('camera_denied');
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    cameraType: ImagePicker.CameraType.front,
    quality: 0.8,
    allowsEditing: false,
    exif: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  try {
    const out = await ImageManipulator.manipulateAsync(asset.uri, resizeAction(asset.width, asset.height), {
      compress: PHOTO_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (!out.base64) throw new Error('no base64');
    return { uri: out.uri, base64: `data:image/jpeg;base64,${out.base64}`, width: out.width, height: out.height };
  } catch {
    throw new CaptureError('photo_failed');
  }
}

/**
 * Joylashuv AVTOMATIK olinadi (foydalanuvchi qarori 2026-10-06: qo'lda kiritish yo'q). Android
 * soxta joylashuv ilovasi (`mocked`) aniqlansa belgi yuborilmaydi.
 * Aniq joylashuv: yuqori aniqlik bilan so'raladi; `LOCATION_TIMEOUT_MS` ichida kelmasa oxirgi
 * ma'lum nuqta (5 daqiqadan yangi) olinadi — `fromCache` bilan, ekran buni ko'rsatadi.
 */
export async function getCheckinLocation(): Promise<CapturedLocation> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw new CaptureError('location_denied');
  try {
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), LOCATION_TIMEOUT_MS)),
    ]);
    if (pos.mocked) throw new CaptureError('location_mocked');
    return toLocation(pos, false);
  } catch (e) {
    if (e instanceof CaptureError) throw e;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 }).catch(() => null);
    if (last?.mocked) throw new CaptureError('location_mocked');
    if (last) return toLocation(last, true);
    throw new CaptureError('location_unavailable');
  }
}

function toLocation(pos: Location.LocationObject, fromCache: boolean): CapturedLocation {
  const acc = pos.coords.accuracy;
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy_m: acc != null && Number.isFinite(acc) ? Math.round(acc) : undefined,
    fromCache,
  };
}

/** Ikki nuqta orasidagi masofa (metr, haversine) — yuborishdan oldin taxminiy ko'rsatish uchun;
 *  yakuniy masofani server hisoblaydi. */
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Eng yaqin safar manzili nuqtasi (koordinatasi borlaridan). Yo'q — `null`. */
export function nearestDestination<T extends { latitude?: number | null; longitude?: number | null }>(
  here: { latitude: number; longitude: number },
  points: T[],
): { point: T; meters: number } | null {
  let best: { point: T; meters: number } | null = null;
  for (const p of points) {
    if (p.latitude == null || p.longitude == null) continue;
    const m = distanceMeters(here, { latitude: p.latitude, longitude: p.longitude });
    if (!best || m < best.meters) best = { point: p, meters: m };
  }
  return best;
}

/** «850 m» / «12,4 km» ko'rinishi. */
export function formatDistance(meters: number | null | undefined): string | null {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0).replace('.', ',')} km`;
}
