import React from 'react';
import { Platform } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { OnlyOfficeFrame } from '../OnlyOfficeFrame';

const realOS = Platform.OS;
afterEach(() => {
  Platform.OS = realOS;
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
    expect(queryByTestId('onlyoffice-iframe-host')).toBeNull();
  });

  it('vebda WebView emas, srcDoc li iframe chiziladi', async () => {
    Platform.OS = 'web';
    const { getByTestId, queryByTestId, toJSON } = await renderWithProviders(
      <OnlyOfficeFrame config={config} errorLabel="Xato" title="Buyruq" />,
    );
    expect(queryByTestId('webview')).toBeNull();
    expect(getByTestId('onlyoffice-iframe-host')).toBeTruthy();
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('"type":"iframe"');
    expect(tree).toContain('DocsAPI.DocEditor');
    expect(tree).toContain('"title":"Buyruq"');
  });
});
