// Video qo'llanmani ilova ICHIDA o'ynatish (2026-10-06: «link bilan hr-minioga o'tib ketyapti»).
// `expo-video` yangi native modul — do'kon relizini talab qiladi; mavjud react-native-webview
// ichidagi HTML5 <video> esa OTA bilan chiqadi va tizim pleyerining boshqaruvlarini beradi.

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildVideoHtml(url: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:black}video{width:100%;height:100%;object-fit:contain;background:black}</style>
</head><body><video src="${escapeAttr(url)}" controls autoplay playsinline preload="metadata"></video></body></html>`;
}
