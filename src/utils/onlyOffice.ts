// OnlyOffice muharriri uchun HTML sahifa — buyruq, xat va umumiy hujjat
// ko'ruvchilari uchun bitta joyda. Sahifa faqat muharrir UI'sini (api.js)
// yuklaydi va unga server JWT bilan imzolagan konfigni beradi; hujjat
// baytlarini OnlyOffice o'zi (server-serverga) konfigdagi URL'lardan oladi.
//
// Nativeda bu HTML WebView'ga `source.html` sifatida beriladi. Vebda HTML
// ishlatilmaydi: `<iframe srcDoc>` ning kelib chiqishi shaffof emas (`about:srcdoc`,
// `parentOrigin=null`) va muharrir yuklansa-da hujjatni hech qachon ochmaydi (QA
// 2026-10-05). Shuning uchun vebda api.js asosiy hujjatga bir marta yuklanadi
// (`loadOnlyOfficeApi`) va `DocsAPI.DocEditor` xuddi shu konfig
// (`buildOnlyOfficeEditorConfig`) bilan to'g'ridan-to'g'ri yaratiladi.

export type OnlyOfficeEditorType = 'mobile' | 'desktop';

/** Telefon/WebView — `mobile`; keng brauzer oynasida to'liq `desktop` UI (v2 kabi). */
export function onlyOfficeEditorType(os: string, width: number): OnlyOfficeEditorType {
  return os === 'web' && width >= 600 ? 'desktop' : 'mobile';
}

/** Ko'ruvchi qaysi usulda chiziladi: vebda asosiy hujjatdagi DocEditor, qolganida native WebView. */
export function onlyOfficeFrameKind(os: string): 'dom' | 'webview' {
  return os === 'web' ? 'dom' : 'webview';
}

/** OnlyOffice server'idagi muharrir API skripti. */
export function onlyOfficeApiUrl(serverUrl: string): string {
  return `${serverUrl}/web-apps/apps/api/documents/api.js`;
}

/** Server imzolagan konfig + ko'rinish turi va o'lcham — native HTML va veb uchun bir xil. */
export function buildOnlyOfficeEditorConfig(
  config: Record<string, unknown>,
  editorType: OnlyOfficeEditorType = 'mobile',
): Record<string, unknown> {
  return { ...config, type: editorType, width: '100%', height: '100%' };
}

/** api.js beradigan global (faqat kerakli qismi). */
export type DocsApiGlobal = {
  DocEditor: new (placeholderId: string, config: Record<string, unknown>) => { destroyEditor?: () => void };
};

export function getDocsApi(): DocsApiGlobal | undefined {
  return (globalThis as { DocsAPI?: DocsApiGlobal }).DocsAPI;
}

type ScriptDocument = {
  createElement(tag: 'script'): {
    src: string;
    async: boolean;
    onload: (() => void) | null;
    onerror: (() => void) | null;
    remove?: () => void;
  };
  head: { appendChild(node: unknown): unknown };
};

const apiLoads = new Map<string, Promise<void>>();

/**
 * Vebda api.js ni bir marta yuklaydi (bir nechta ko'ruvchi / qayta ochish bitta
 * `<script>` ni bo'lishadi). Yuklanmasa va'da rad etiladi va keyingi urinish
 * skriptni qaytadan qo'shadi.
 */
export function loadOnlyOfficeApi(serverUrl: string, doc?: ScriptDocument): Promise<void> {
  const src = onlyOfficeApiUrl(serverUrl);
  const pending = apiLoads.get(src);
  if (pending) return pending;
  if (getDocsApi()) return Promise.resolve();
  const d = doc ?? (globalThis as { document?: ScriptDocument }).document;
  if (!d) return Promise.reject(new Error('document is not available'));
  const load = new Promise<void>((resolve, reject) => {
    const script = d.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      apiLoads.delete(src);
      script.remove?.();
      reject(new Error(`OnlyOffice api.js failed to load: ${src}`));
    };
    d.head.appendChild(script);
  });
  apiLoads.set(src, load);
  return load;
}

// `<script>` ichiga JSON qo'yilganda `</script>` (yoki `<!--`) satri skriptni
// erta yopib qo'ymasin — `<` ni JS escape (teskari chiziq + u003c) bilan almashtiramiz
// (JSON ma'nosi o'zgarmaydi).
const BACKSLASH = String.fromCharCode(92);
function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, BACKSLASH + 'u003c');
}

export function buildOnlyOfficeHtml(opts: {
  config: Record<string, unknown>;
  serverUrl: string;
  errorLabel: string;
  editorType?: OnlyOfficeEditorType;
}): string {
  const editorConfig = buildOnlyOfficeEditorConfig(opts.config, opts.editorType);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script type="text/javascript" src="${onlyOfficeApiUrl(opts.serverUrl)}"></script>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background: white; }
    #editor { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script type="text/javascript">
    try {
      new DocsAPI.DocEditor("editor", ${scriptSafeJson(editorConfig)});
    } catch (e) {
      var box = document.createElement('div');
      box.style.cssText = 'padding:24px;font-family:sans-serif;color:#333';
      box.textContent = ${scriptSafeJson(opts.errorLabel)} + ': ' + (e && e.message);
      document.body.textContent = '';
      document.body.appendChild(box);
    }
  </script>
</body>
</html>`;
}
