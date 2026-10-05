// OnlyOffice muharriri uchun HTML sahifa — buyruq, xat va umumiy hujjat
// ko'ruvchilari uchun bitta joyda. Sahifa faqat muharrir UI'sini (api.js)
// yuklaydi va unga server JWT bilan imzolagan konfigni beradi; hujjat
// baytlarini OnlyOffice o'zi (server-serverga) konfigdagi URL'lardan oladi.
//
// Nativeda bu HTML WebView'ga `source.html`, vebda esa `<iframe srcDoc>` ga
// beriladi (react-native-webview vebni qo'llamaydi).

export type OnlyOfficeEditorType = 'mobile' | 'desktop';

/** Telefon/WebView — `mobile`; keng brauzer oynasida to'liq `desktop` UI (v2 kabi). */
export function onlyOfficeEditorType(os: string, width: number): OnlyOfficeEditorType {
  return os === 'web' && width >= 600 ? 'desktop' : 'mobile';
}

/** Ko'ruvchi qaysi usulda chiziladi: vebda iframe, qolganida native WebView. */
export function onlyOfficeFrameKind(os: string): 'iframe' | 'webview' {
  return os === 'web' ? 'iframe' : 'webview';
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
  const editorConfig = { ...opts.config, type: opts.editorType ?? 'mobile', width: '100%', height: '100%' };
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script type="text/javascript" src="${opts.serverUrl}/web-apps/apps/api/documents/api.js"></script>
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
