import { buildOnlyOfficeHtml, onlyOfficeEditorType, onlyOfficeFrameKind } from '../onlyOffice';

describe('onlyOffice', () => {
  it('vebda iframe, nativeda WebView tanlanadi', () => {
    expect(onlyOfficeFrameKind('web')).toBe('iframe');
    expect(onlyOfficeFrameKind('ios')).toBe('webview');
    expect(onlyOfficeFrameKind('android')).toBe('webview');
  });

  it('keng veb oynasida desktop, telefon/WebView da mobile UI', () => {
    expect(onlyOfficeEditorType('web', 1366)).toBe('desktop');
    expect(onlyOfficeEditorType('web', 390)).toBe('mobile');
    expect(onlyOfficeEditorType('ios', 1366)).toBe('mobile');
    expect(onlyOfficeEditorType('android', 800)).toBe('mobile');
  });

  it("HTML api.js ni server manzilidan yuklaydi va konfigni o'zgartirmay uzatadi", () => {
    const config = { document: { key: 'k1', url: 'https://hr-api/x' }, token: 'jwt.abc' };
    const html = buildOnlyOfficeHtml({
      config,
      serverUrl: 'https://oo.example',
      errorLabel: 'Xato',
      editorType: 'desktop',
    });
    expect(html).toContain(
      '<script type="text/javascript" src="https://oo.example/web-apps/apps/api/documents/api.js">',
    );
    const m = html.match(/DocEditor\("editor", (.*)\);/);
    expect(JSON.parse(m![1])).toEqual({ ...config, type: 'desktop', width: '100%', height: '100%' });
  });

  it("konfig yoki xato matnidagi </script> skriptni yopib qo'ymaydi", () => {
    const html = buildOnlyOfficeHtml({
      config: { title: '</script><script>alert(1)</script>' },
      serverUrl: 'https://oo',
      errorLabel: "Hujjatni ochib bo'lmadi </script>",
    });
    expect(html.match(/<\/script>/g)).toHaveLength(2); // faqat api.js va ichki skriptning o'z yopilishi
    expect(html).toContain(`"Hujjatni ochib bo'lmadi `);
    expect(html).not.toContain("bo'lmadi </script>");
    expect(html).toContain('"type":"mobile"');
  });
});
