import React from 'react';
import { Dimensions, Platform } from 'react-native';
import { act } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { OnlyOfficeFrame } from '../OnlyOfficeFrame';
import { ONLYOFFICE_SERVER_URL } from '@/api/urls';
import { onlyOfficeEditorType } from '@/utils/onlyOffice';

const realOS = Platform.OS;
const g = globalThis as Record<string, unknown>;
const realDocument = g.document;

type FakeScript = { src: string; onload: (() => void) | null; onerror: (() => void) | null; remove: () => void };

// Minimal DOM: the host <div> React renders is found by id; api.js is a <script>
// we resolve/reject by hand; DocsAPI is defined only once the script "loads".
function installFakeDom() {
  const scripts: FakeScript[] = [];
  const host = { id: '', children: [] as unknown[], appendChild: jest.fn(), replaceChildren: jest.fn() };
  host.appendChild.mockImplementation((n: unknown) => host.children.push(n));
  host.replaceChildren.mockImplementation(() => (host.children.length = 0));
  g.document = {
    getElementById: jest.fn(() => host),
    createElement: jest.fn((tag: string) =>
      tag === 'script'
        ? { src: '', async: false, onload: null, onerror: null, remove: jest.fn() }
        : { id: '', style: { cssText: '' }, appendChild: jest.fn(), textContent: '' },
    ),
    head: { appendChild: jest.fn((s: FakeScript) => scripts.push(s)) },
  };
  return { scripts, host };
}

function installDocsApi() {
  const destroyEditor = jest.fn();
  const DocEditor = jest.fn(() => ({ destroyEditor }));
  g.DocsAPI = { DocEditor };
  return { DocEditor, destroyEditor };
}

afterEach(() => {
  Platform.OS = realOS;
  g.document = realDocument;
  delete g.DocsAPI;
});

const config = { document: { key: 'k' }, token: 't' };

describe('OnlyOfficeFrame', () => {
  it('nativeda WebView ga html + baseUrl beradi', async () => {
    Platform.OS = 'android';
    const { getByTestId, queryByTestId } = await renderWithProviders(
      <OnlyOfficeFrame config={config} errorLabel="Xato" />,
    );
    const wv = getByTestId('webview');
    expect(wv.props.source.html).toContain('DocsAPI.DocEditor');
    expect(wv.props.source.baseUrl).toBeTruthy();
    expect(queryByTestId('onlyoffice-dom-host')).toBeNull();
  });

  it("vebda iframe/WebView emas: api.js bir marta yuklanadi, DocEditor konfig bilan yaratiladi va chiqishda yo'q qilinadi", async () => {
    Platform.OS = 'web';
    const { scripts, host } = installFakeDom();
    const first = await renderWithProviders(<OnlyOfficeFrame config={config} errorLabel="Xato" title="Buyruq" />);
    const second = await renderWithProviders(<OnlyOfficeFrame config={config} errorLabel="Xato" />);

    expect(first.queryByTestId('webview')).toBeNull();
    const tree = JSON.stringify(first.toJSON());
    expect(tree).toContain('"type":"div"');
    expect(tree).not.toContain('iframe');
    expect(tree).toContain('"aria-label":"Buyruq"');

    // ikki ko'ruvchi — bitta <script>
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(`${ONLYOFFICE_SERVER_URL}/web-apps/apps/api/documents/api.js`);

    const { DocEditor, destroyEditor } = installDocsApi();
    await act(async () => {
      scripts[0].onload?.();
    });
    expect(DocEditor).toHaveBeenCalledTimes(2);
    const calls = DocEditor.mock.calls as unknown as [string, Record<string, unknown>][];
    const [placeholderId, passed] = calls[0];
    expect(placeholderId).toMatch(/^onlyoffice-host-\d+-editor-0$/);
    const type = onlyOfficeEditorType('web', Dimensions.get('window').width);
    expect(passed).toMatchObject({ ...config, type, width: '100%', height: '100%' });
    expect(typeof (passed.events as Record<string, unknown>).onError).toBe('function');
    expect(host.appendChild).toHaveBeenCalled();

    await first.unmount();
    expect(destroyEditor).toHaveBeenCalledTimes(1);
    expect(host.replaceChildren).toHaveBeenCalled();
    await second.unmount();
    expect(destroyEditor).toHaveBeenCalledTimes(2);
  });

  it('vebda muharrir onError bersa — xato holati va qayta urinish', async () => {
    Platform.OS = 'web';
    installFakeDom();
    const { DocEditor } = installDocsApi();
    const { findByTestId, getByText } = await renderWithProviders(
      <OnlyOfficeFrame config={config} errorLabel="Hujjat ochilmadi" />,
    );
    await act(async () => {});
    expect(DocEditor).toHaveBeenCalledTimes(1);
    const calls = DocEditor.mock.calls as unknown as [string, { events: { onError: () => void } }][];
    await act(async () => {
      calls[0][1].events.onError();
    });
    expect(await findByTestId('onlyoffice-error')).toBeTruthy();
    expect(getByText('Hujjat ochilmadi')).toBeTruthy();
  });
});
