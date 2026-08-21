// Centralised, typed environment access.
//
// Values come from `EXPO_PUBLIC_*` variables (inlined at build time by Expo).
// Each has a production default so the app keeps working without a .env file,
// but any build/environment can override via EAS environment variables or a
// local .env. Access config through this module — never read process.env or
// hard-code URLs elsewhere.

function readUrl(value: string | undefined, fallback: string): string {
  const raw = (value ?? '').trim() || fallback;
  // Fail loudly on a misconfigured override rather than shipping `undefined/api`.
  if (!/^https?:\/\/.+/.test(raw)) {
    throw new Error(`[env] Invalid URL: "${raw}" (expected http(s)://…)`);
  }
  return raw.replace(/\/+$/, '');
}

export const Env = Object.freeze({
  /** Base URL of the HR REST API. */
  apiUrl: readUrl(process.env.EXPO_PUBLIC_API_URL, 'https://hr-api.uzgidro.uz'),
  /** OnlyOffice document server that serves the editor api.js. */
  onlyOfficeUrl: readUrl(
    process.env.EXPO_PUBLIC_ONLYOFFICE_URL,
    'https://doc-editor.uzgidro.uz'
  ),
  /**
   * MapLibre style viewer of OUR OWN tile server (tileserver-gl behind the web
   * host). Turniket hodisasining joylashuvi shu sahifada WebView ichida
   * ko'rsatiladi — tashqi xarita provayderi (Google/OSM) ISHLATILMAYDI, chunki
   * veb ham aynan shu tayler serveridan foydalanadi va ma'lumot tashqariga
   * chiqmaydi. Manzil `#zoom/lat/lon` fragmenti bilan markazlashtiriladi.
   */
  mapViewerUrl: readUrl(
    process.env.EXPO_PUBLIC_MAP_VIEWER_URL,
    'https://hr.uzgidro.uz/tiles/styles/uzgidro-dark/'
  ),
});

export type EnvConfig = typeof Env;
