import { Env } from '@/config/env';
import type { AttendanceEvent, TurnstileLocation } from '@/types';

// Turniket hodisasining "qayerda" va "qanday" ma'lumotini bitta joydan olish.
// SOF funksiyalar: ekranlar (mening tabelim, xodim kalendari) ularni ulashadi
// va testlar React'siz tekshiradi (loyiha konvensiyasi).

/** Kirish hodisasimi. Backend `direction_type` YOKI `check_in_out_type` yuboradi. */
export function isEntryEvent(ev: Pick<AttendanceEvent, 'direction_type' | 'check_in_out_type'>): boolean {
  return ev.direction_type === 'entrance' || ev.check_in_out_type === 1;
}

/** Chiqish hodisasimi (kirish emasligi YETARLI emas: noma'lum yo'nalish ham bor). */
export function isExitEvent(ev: Pick<AttendanceEvent, 'direction_type' | 'check_in_out_type'>): boolean {
  return ev.direction_type === 'exit' || ev.check_in_out_type === 2;
}

export interface AttendancePlace {
  /** Ko'rsatiladigan nom: "Ges 8" (joylashuv) yoki filial/qurilma nomi. */
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

function firstLocation(ev: AttendanceEvent): TurnstileLocation | null {
  const locs = ev.turnstile?.locations;
  if (!locs || locs.length === 0) return null;
  // Koordinatasi bor joylashuv ustun — xarita aynan shundan chiziladi.
  return locs.find((l) => l?.latitude != null && l?.longitude != null) ?? locs[0] ?? null;
}

/**
 * Hodisa QAYSI GES/obyektda bo'lganini aniqlaydi.
 *
 * Nom tartibi: joylashuv nomi ("Ges 8") → filial nomi → qurilmaning ko'rsatma
 * nomi → HIK qurilma nomi ("Ges 8 chiqish"). Qurilma nomi eng oxirida, chunki
 * unda yo'nalish so'zi ham bor va u qatorda ikki marta takrorlanardi.
 */
export function eventPlace(ev: AttendanceEvent): AttendancePlace {
  const loc = firstLocation(ev);
  const name =
    loc?.name?.trim() ||
    loc?.organization_branch?.name?.trim() ||
    ev.turnstile?.display_name?.trim() ||
    ev.turnstile?.acs_dev_name?.trim() ||
    ev.turnstile?.name?.trim() ||
    null;
  return {
    name: name || null,
    address: loc?.address?.trim() || null,
    latitude: loc?.latitude ?? null,
    longitude: loc?.longitude ?? null,
  };
}

/** Face ID surati (MinIO imzolangan URL) yoki null. */
export function eventPhotoUrl(ev: AttendanceEvent): string | null {
  const url = (ev.photo_path ?? '').trim();
  return url ? url : null;
}

export function hasCoords(place: AttendancePlace): boolean {
  return place.latitude != null && place.longitude != null;
}

/**
 * O'Z tayler serverimizdagi MapLibre ko'ruvchisi manzili (WebView uchun).
 * `#zoom/lat/lon` — tileserver-gl ko'ruvchisi shu fragment bo'yicha markazlashadi.
 */
export function mapViewerUrl(place: AttendancePlace, zoom = 16): string | null {
  if (!hasCoords(place)) return null;
  // Oxiridagi "/" MAJBURIY: ko'ruvchi sahifasi nisbiy manzillar bilan yuklanadi
  // (`/tiles/styles/<style>/...`) — slashsiz ular bir pog'ona yuqoriga
  // ("/tiles/styles/") ketib, xarita ochilmay qolardi.
  return `${Env.mapViewerUrl}/#${zoom}/${place.latitude}/${place.longitude}`;
}

/**
 * Telefondagi xarita ilovasi uchun manzil (Linking.openURL).
 * `geo:` — Android; iOS uni tushunmaydi, shu bois `maps:` bilan chaqiriladi
 * (ekran platformaga qarab tanlaydi).
 */
export function mapAppUrl(place: AttendancePlace, platform: 'ios' | 'android' | 'web'): string | null {
  if (!hasCoords(place)) return null;
  const lat = place.latitude;
  const lon = place.longitude;
  const label = encodeURIComponent(place.name ?? '');
  if (platform === 'ios') return `maps:0,0?q=${label}@${lat},${lon}`;
  if (platform === 'android') return `geo:${lat},${lon}?q=${lat},${lon}(${label})`;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
}
