import {
  buildOnlyOfficeEditorConfig,
  buildOnlyOfficeHtml,
  loadOnlyOfficeApi,
  onlyOfficeEditorType,
  onlyOfficeFrameKind,
} from '../onlyOffice';

type FakeScript = {
  src: string;
  async: boolean;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  remove: jest.Mock;
};

function fakeDoc() {
  const scripts: FakeScript[] = [];
  const doc = {
    createElement: jest.fn(() => ({ src: '', async: false, onload: null, onerror: null, remove: jest.fn() })),
    head: { appendChild: jest.fn((s: FakeScript) => scripts.push(s)) },
  };
  return { doc, scripts };
}

describe('onlyOffice', () => {
  it('vebda asosiy hujjatdagi DocEditor (srcDoc iframe emas), nativeda WebView tanlanadi', () => {
    expect(onlyOfficeFrameKind('web')).toBe('dom');
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

  it('veb konfigi native HTML dagi bilan bir xil', () => {
    const config = { document: { key: 'k1' }, token: 'jwt' };
    const html = buildOnlyOfficeHtml({ config, serverUrl: 'https://oo', errorLabel: 'X', editorType: 'desktop' });
    const m = html.match(/DocEditor\("editor", (.*)\);/);
    expect(buildOnlyOfficeEditorConfig(config, 'desktop')).toEqual(JSON.parse(m![1]));
    expect(buildOnlyOfficeEditorConfig(config)).toMatchObject({ type: 'mobile' });
  });

  describe('loadOnlyOfficeApi', () => {
    afterEach(() => {
      delete (globalThis as Record<string, unknown>).DocsAPI;
    });

    it("api.js <script> ni bir marta qo'shadi — parallel chaqiruvlar bitta yuklashni bo'lishadi", async () => {
      const { doc, scripts } = fakeDoc();
      const a = loadOnlyOfficeApi('https://oo-once', doc);
      const b = loadOnlyOfficeApi('https://oo-once', doc);
      expect(scripts).toHaveLength(1);
      expect(scripts[0].src).toBe('https://oo-once/web-apps/apps/api/documents/api.js');
      expect(scripts[0].async).toBe(true);
      scripts[0].onload!();
      await expect(Promise.all([a, b])).resolves.toEqual([undefined, undefined]);
      await loadOnlyOfficeApi('https://oo-once', doc);
      expect(scripts).toHaveLength(1);
    });

    it("DocsAPI allaqachon bor bo'lsa skript qo'shilmaydi", async () => {
      (globalThis as Record<string, unknown>).DocsAPI = { DocEditor: jest.fn() };
      const { doc, scripts } = fakeDoc();
      await loadOnlyOfficeApi('https://oo-present', doc);
      expect(scripts).toHaveLength(0);
    });

    it('yuklanmasa rad etadi, skriptni olib tashlaydi va keyingi urinish qaytadan yuklaydi', async () => {
      const { doc, scripts } = fakeDoc();
      const first = loadOnlyOfficeApi('https://oo-down', doc);
      scripts[0].onerror!();
      await expect(first).rejects.toThrow('api.js');
      expect(scripts[0].remove).toHaveBeenCalled();
      const retry = loadOnlyOfficeApi('https://oo-down', doc);
      expect(scripts).toHaveLength(2);
      scripts[1].onload!();
      await expect(retry).resolves.toBeUndefined();
    });
  });
});
