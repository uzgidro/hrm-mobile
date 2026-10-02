// web v2 `lib/format.ts` formatDuration: 65 → «1:05», 3725 → «1:02:05».
export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/**
 * `video_url` serverdan keladi va `Linking.openURL` ga beriladi: `javascript:`,
 * `intent:`, `file:`, `data:` kabi sxemalar tizim darajasida ochilmasin — faqat http(s).
 */
export function isSafeVideoUrl(url?: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url.trim());
}
