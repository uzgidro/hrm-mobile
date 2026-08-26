// QR orqali web'ga kirishni TASDIQLASH (TZ 4.2.3).
//
// Oqim: brauzer QR chizadi -> mobil ilova skanerlaydi -> foydalanuvchi
// tasdiqlaydi -> brauzer token oladi. Bu yerda MOBIL tomon: skan va tasdiq.
//
// ⚠️ QR ichida token YO'Q — faqat kanal identifikatori va skaner kaliti.
// Token brauzer tomonida, `claim` chaqiruvida yaratiladi.
import { apiClient } from '@/api/client';

export const QR_PREFIX = 'hrmqr:v1';

export type QrPayload = { channelId: string; qrSecret: string };

/** `hrmqr:v1:<channel>:<secret>` ni bo'laklarga ajratadi. */
export function parseQrPayload(raw: string): QrPayload | null {
  const value = (raw || '').trim();
  if (!value.startsWith(`${QR_PREFIX}:`)) return null;
  const rest = value.slice(QR_PREFIX.length + 1);
  const sep = rest.indexOf(':');
  if (sep <= 0) return null;
  const channelId = rest.slice(0, sep);
  const qrSecret = rest.slice(sep + 1);
  if (!channelId || !qrSecret) return null;
  return { channelId, qrSecret };
}

export type QrBrowserInfo = { ip?: string | null; user_agent?: string | null };

export async function qrScan(p: QrPayload): Promise<{ state: string; browser: QrBrowserInfo }> {
  const { data } = await apiClient.post('auth/qr/scan', {
    channel_id: p.channelId,
    qr_secret: p.qrSecret,
  });
  return data;
}

export async function qrApprove(p: QrPayload): Promise<{ state: string }> {
  const { data } = await apiClient.post('auth/qr/approve', {
    channel_id: p.channelId,
    qr_secret: p.qrSecret,
  });
  return data;
}

export async function qrReject(p: QrPayload): Promise<{ state: string }> {
  const { data } = await apiClient.post('auth/qr/reject', {
    channel_id: p.channelId,
    qr_secret: p.qrSecret,
  });
  return data;
}
