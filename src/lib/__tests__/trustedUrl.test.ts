// Ilova ichidagi WebView faqat o'z domenimizni ochadi (fishing deep-link, audit 2026-10-09).
import { Linking } from 'react-native';
import { guardWebViewNavigation, isTrustedAppUrl } from '../trustedUrl';

describe('isTrustedAppUrl', () => {
  it.each([
    'https://uzgidro.uz/news/view/12',
    'https://www.uzgidro.uz/',
    'https://hr-minio.uzgidro.uz/video/a.mp4?X-Amz-Signature=abc%20d',
    'https://doc-editor.uzgidro.uz:443/web-apps/apps/api/documents/api.js',
  ])('ishonchli: %s', (url) => expect(isTrustedAppUrl(url)).toBe(true));

  it.each([
    'http://uzgidro.uz/',
    'https://evil.example/login',
    'https://uzgidro.uz.evil.example/',
    'https://evil-uzgidro.uz/',
    'https://uzgidro.uz@evil.example/',
    // WHATWG `\` = `/` — brauzer evil.com ni ochadi (kod ko'rigi topilmasi).
    'https://evil.com\\.uzgidro.uz/',
    'https://evil.com\t.uzgidro.uz/',
    'https://evil.com\n.uzgidro.uz/',
    'https://evil.com%2F.uzgidro.uz/',
    'javascript:alert(1)//.uzgidro.uz',
    'intent://uzgidro.uz#Intent;end',
    '',
  ])('rad: %j', (url) => expect(isTrustedAppUrl(url)).toBe(false));
});

describe('guardWebViewNavigation', () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  afterEach(() => open.mockClear());

  it('ishonchli manzil va ichki iframe — WebView ichida', () => {
    expect(guardWebViewNavigation({ url: 'https://uzgidro.uz/news/view/1', isTopFrame: true })).toBe(true);
    expect(guardWebViewNavigation({ url: 'https://www.youtube.com/embed/x', isTopFrame: false })).toBe(true);
    expect(guardWebViewNavigation({ url: 'about:blank' })).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });

  it('begona https — tizim brauzerida; boshqa sxema — rad', () => {
    expect(guardWebViewNavigation({ url: 'https://evil.example/', isTopFrame: true })).toBe(false);
    expect(open).toHaveBeenCalledWith('https://evil.example/');
    open.mockClear();
    expect(guardWebViewNavigation({ url: 'intent://x#Intent;end', isTopFrame: true })).toBe(false);
    expect(guardWebViewNavigation({ url: 'file:///data/data/uz.uzgidro.hrm/x', isTopFrame: true })).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
