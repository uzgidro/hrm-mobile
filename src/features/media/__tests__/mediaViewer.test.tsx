import React from 'react';
import { renderWithProviders, screen } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import { buildVideoHtml } from '../videoHtml';
import MediaViewerScreen from '../screens/MediaViewerScreen';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
}));

// 2026-10-06: video qo'llanma va yangilik maqolasi ilova ichida ochiladi.
describe('ilova ichidagi ko\'rsatkich', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
  });

  it('video HTML: inline pleyer, URL atributda xavfsiz', () => {
    const html = buildVideoHtml('https://hr-minio.uzgidro.uz/v/a.mp4?x=1&y="2"');
    expect(html).toContain('<video src="https://hr-minio.uzgidro.uz/v/a.mp4?x=1&amp;y=&quot;2&quot;"');
    expect(html).toContain('controls autoplay playsinline');
  });

  it('video: WebView sarlavha bilan; xavfli URL — xato holati, WebView yo\'q', async () => {
    mockParams = { kind: 'video', url: 'https://hr-minio.uzgidro.uz/v/x.mp4', title: 'Davomat' };
    await renderWithProviders(<MediaViewerScreen />);
    expect(screen.getByText('Davomat')).toBeTruthy();
    expect(screen.getByTestId('media-viewer')).toBeTruthy();

    mockParams = { kind: 'page', url: 'javascript:alert(1)' };
    await renderWithProviders(<MediaViewerScreen />);
    expect(screen.queryByTestId('media-viewer')).toBeNull();
    expect(screen.getByText(i18n.t('common.mediaLoadFailed'))).toBeTruthy();
  });

  it('deep-link fishing: begona https sayt ilova ichida OCHILMAYDI', async () => {
    for (const url of ['https://evil.example/login', 'https://uzgidro.uz.evil.example/', 'https://uzgidro.uz@evil.example/']) {
      mockParams = { kind: 'page', url };
      await renderWithProviders(<MediaViewerScreen />);
      expect(screen.queryByTestId('media-viewer')).toBeNull();
    }
    mockParams = { kind: 'page', url: 'https://uzgidro.uz/news/view/12' };
    await renderWithProviders(<MediaViewerScreen />);
    expect(screen.getByTestId('media-viewer')).toBeTruthy();
  });
});
