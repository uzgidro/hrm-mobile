// Server bergan havolalar `Linking.openURL` ga faqat http(s) bo'lsa beriladi:
// `javascript:`, `intent:`, `file:`, `data:` kabi sxemalar tizim darajasida ochilmasin.
// (videoGuide/learning'dagi mahalliy nusxalarning umumiy varianti — feature'lararo import yo'q.)
export function isHttpUrl(url?: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url.trim());
}
