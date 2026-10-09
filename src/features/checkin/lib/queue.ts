// «Keldim» oflayn navbati. GES / uzoq filialda tarmoq tez-tez uziladi: surat va joylashuv
// telefonda olinadi, yuborish uzilsa belgi diskda saqlanadi va tarmoq qaytganda o'z vaqti
// (`captured_at`) bilan yuboriladi. Har belgining `client_uuid` i bor — server bir xil kalit
// bilan kelgan takror so'rovni yangi belgi qilmaydi, shuning uchun qayta yuborish xavfsiz.
//
// Saqlash `formDraft` bilan bir xil (native — expo-file-system, web — localStorage).
import * as Crypto from 'expo-crypto';
import type { AxiosError } from 'axios';
import { clearDraft, getDraftOwner, loadDraft, saveDraft } from '@/lib/formDraft';
import { createCheckin } from '../api/mutations';
import type { CheckinCreateBody, MobileCheckin } from '../types';

export const QUEUE_KEY = 'mobile-checkin-queue';
/** Server 48 soatdan eski belgini rad etadi — undan eskisini yubormaymiz. */
export const QUEUE_MAX_AGE_MS = 47 * 60 * 60 * 1000;

export type QueuedCheckin = { body: CheckinCreateBody; queuedAt: string; attempts: number };
export type SubmitResult = { kind: 'sent'; checkin: MobileCheckin } | { kind: 'queued'; item: QueuedCheckin };
export type FlushResult = { sent: MobileCheckin[]; failed: { item: QueuedCheckin; error: unknown }[]; pending: number };

export function newClientUuid(): string {
  return Crypto.randomUUID();
}

/** Javobsiz uzilish (tarmoq yo'q / vaqt tugadi) yoki server vaqtincha band — keyin qayta urinsa bo'ladi. */
export function isRetryable(error: unknown): boolean {
  const e = error as AxiosError | undefined;
  if (!e?.response) return true;
  const s = e.response.status;
  return s === 408 || s === 429 || s >= 500;
}

export async function readQueue(): Promise<QueuedCheckin[]> {
  const q = await loadDraft<QueuedCheckin[]>(QUEUE_KEY);
  return Array.isArray(q) ? q : [];
}

async function writeQueue(items: QueuedCheckin[]): Promise<void> {
  if (items.length) await saveDraft(QUEUE_KEY, items);
  else await clearDraft(QUEUE_KEY);
}

async function enqueue(item: QueuedCheckin): Promise<void> {
  const q = await readQueue();
  if (!q.some((x) => x.body.client_uuid === item.body.client_uuid)) q.push(item);
  await writeQueue(q);
}

/**
 * Yuborish: muvaffaqiyat — belgi; tarmoq/server vaqtincha xatosi — navbatga (`queued`);
 * boshqa xato (403 safar yo'q, 400 vaqt, 409 davr yopiq…) — chaqiruvchiga otiladi.
 * `captured_at` HAR DOIM telefon vaqti bilan yuboriladi: navbatdan ketsa ham o'z vaqtiga tushadi.
 */
export async function submitCheckin(body: CheckinCreateBody, now: Date = new Date()): Promise<SubmitResult> {
  try {
    return { kind: 'sent', checkin: await createCheckin(body) };
  } catch (e) {
    if (!isRetryable(e)) throw e;
    const item = { body, queuedAt: now.toISOString(), attempts: 1 };
    await enqueue(item);
    return { kind: 'queued', item };
  }
}

let flushing: Promise<FlushResult> | null = null;

/**
 * Navbatni yuborish (bosh sahifa ochilganda, ilova oldinga chiqqanda). Bir vaqtda bitta
 * flush — parallel chaqiruv o'shaning natijasini kutadi. Qayta urinib bo'lmaydigan xato yoki
 * 47 soatdan eski belgi navbatdan chiqariladi va `failed` da qaytadi (ekran xabar beradi).
 */
export function flushQueue(now: Date = new Date()): Promise<FlushResult> {
  if (flushing) return flushing;
  flushing = (async () => {
    // Navbat egasiga bog'langan (formDraft): yuborish davomida sessiya
    // almashsa (chiqish / boshqa xodim kirdi) — qolganini YUBORMAYMIZ va
    // faylga tegmaymiz; ega qayta kirganda davom etadi (server `client_uuid`
    // bo'yicha takrorni yangi belgi qilmaydi).
    const owner = getDraftOwner();
    const q = await readQueue();
    const keep: QueuedCheckin[] = [];
    const sent: MobileCheckin[] = [];
    const failed: FlushResult['failed'] = [];
    for (const item of q) {
      if (getDraftOwner() !== owner) return { sent, failed, pending: q.length - sent.length - failed.length };
      const captured = Date.parse(item.body.captured_at ?? item.queuedAt);
      if (Number.isFinite(captured) && now.getTime() - captured > QUEUE_MAX_AGE_MS) {
        failed.push({ item, error: new Error('too_old') });
        continue;
      }
      try {
        sent.push(await createCheckin(item.body));
      } catch (e) {
        if (isRetryable(e)) keep.push({ ...item, attempts: item.attempts + 1 });
        else failed.push({ item, error: e });
      }
    }
    if (getDraftOwner() !== owner) return { sent, failed, pending: keep.length };
    await writeQueue(keep);
    return { sent, failed, pending: keep.length };
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
