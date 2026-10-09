// Ilova ichidagi WebView faqat O'ZIMIZNING manzillarimizni ochadi.
//
// NEGA (xavfsizlik auditi 2026-10-09): `hrm://media?kind=page&url=<istalgan
// https>` deep-link'i begona saytni ilova sarlavhasi ostida, ilova ichida
// ochardi — SMS'dagi havola orqali soxta «parolni qayta kiriting» sahifasi
// (fishing). Yangiliklar `uzgidro.uz` dan, video MinIO'dan (`*.uzgidro.uz`),
// OnlyOffice/xarita ham shu domenda — boshqa hech narsa kerak emas.
import { Linking } from 'react-native';
import { Env } from '@/config/env';

const TRUSTED_SUFFIX = 'uzgidro.uz';

function hostOf(url: string): string | null {
  // RN'ning URL polifili `hostname` ni hamma versiyada bermaydi — qo'lda ajratamiz.
  const m = /^https:\/\/([^/?#]*)/i.exec(url.trim());
  if (!m) return null;
  const authority = m[1];
  // `https://uzgidro.uz@evil.com` — foydalanuvchi qismi bilan aldash.
  if (!authority || authority.includes('@')) return null;
  return authority.replace(/:\d+$/, '').toLowerCase();
}

const envHosts = [Env.apiUrl, Env.onlyOfficeUrl, Env.mapViewerUrl]
  .map(hostOf)
  .filter((h): h is string => !!h);

/** Faqat `https` va `uzgidro.uz` / `*.uzgidro.uz` (yoki env'dagi o'z serverlarimiz). */
export function isTrustedAppUrl(url?: string | null): url is string {
  if (!url) return false;
  const host = hostOf(url);
  if (!host) return false;
  return host === TRUSTED_SUFFIX || host.endsWith(`.${TRUSTED_SUFFIX}`) || envHosts.includes(host);
}

type NavRequest = { url: string; isTopFrame?: boolean };

/**
 * WebView `onShouldStartLoadWithRequest`: asosiy oyna faqat ishonchli manzilga
 * o'tadi; begona https havola tizim brauzerida ochiladi, qolgani (intent:, file:,
 * javascript: …) rad etiladi. Ichki iframe'lar (iOS'da shu yerga keladi) —
 * sahifaning o'z ishi, ularni to'smaymiz.
 */
export function guardWebViewNavigation(req: NavRequest): boolean {
  if (req.isTopFrame === false) return true;
  const url = req.url || '';
  if (url === 'about:blank' || url.startsWith('about:srcdoc') || url.startsWith('data:')) return true;
  if (isTrustedAppUrl(url)) return true;
  if (/^https:\/\//i.test(url)) void Linking.openURL(url).catch(() => {});
  return false;
}
