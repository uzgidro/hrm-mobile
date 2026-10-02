import React from 'react';
import { Linking } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import { VIDEO_GUIDES } from '@/api/urls';
import { __resetToasts, getToasts } from '@/lib/toast';
import VideoGuideScreen from '../screens/VideoGuideScreen';
import { formatDuration, isSafeVideoUrl } from '../utils/format';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));

describe('formatDuration (v2 lib/format)', () => {
  it.each([
    [null, '0:00'],
    [0, '0:00'],
    [-5, '0:00'],
    [65, '1:05'],
    [600, '10:00'],
    [3725, '1:02:05'],
  ])('%p → %p', (v, out) => expect(formatDuration(v as never)).toBe(out));
});

describe('isSafeVideoUrl — faqat http(s)', () => {
  it.each([
    ['https://cdn.example.uz/a.mp4', true],
    ['http://cdn.example.uz/a.mp4', true],
    ['javascript:alert(1)', false],
    ['intent://scan#Intent;scheme=zxing;end', false],
    ['file:///etc/passwd', false],
    ['data:text/html,<script>', false],
    ['//cdn/a.mp4', false],
    ['', false],
    [null, false],
  ])('%p → %p', (v, ok) => expect(isSafeVideoUrl(v as never)).toBe(ok));
});

describe('VideoGuideScreen (v2 VideoGuidePage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    __resetToasts();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mock.onGet(VIDEO_GUIDES).reply(200, {
      items: [
        {
          id: 1,
          title: 'Davomatni yuritish',
          duration_seconds: 125,
          view_count: 7,
          video_url: 'https://cdn/x.mp4',
          page_key: 'attendance',
        },
        { id: 2, title: 'Buyruq yaratish', view_count: 0, video_url: null, page_key: 'orders' },
      ],
    });
    mock.onPost(`${VIDEO_GUIDES}/1/view`).reply(200, {});
  });
  afterEach(() => {
    mock.reset();
    jest.restoreAllMocks();
  });

  it("galereya: sarlavha, davomiylik, ko'rishlar; qidiruv filtrlaydi", async () => {
    await renderWithProviders(<VideoGuideScreen />);
    expect(await screen.findByText('Davomatni yuritish')).toBeTruthy();
    expect(screen.getByText('2:05')).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText(i18n.t('videoGuide.searchPlaceholder')), 'buyruq');
    expect(screen.queryByText('Davomatni yuritish')).toBeNull();
    expect(screen.getByText('Buyruq yaratish')).toBeTruthy();
  });

  it("ochish: ko'rish hisoblagichi bir marta yuboriladi va video URL ochiladi", async () => {
    await renderWithProviders(<VideoGuideScreen />);
    await fireEvent.press(await screen.findByText('Davomatni yuritish'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://cdn/x.mp4'));
    expect(mock.history.post).toHaveLength(1);
  });

  it('hisoblagich xato bersa ham video ochiladi', async () => {
    mock.onPost(`${VIDEO_GUIDES}/1/view`).reply(500);
    await renderWithProviders(<VideoGuideScreen />);
    await fireEvent.press(await screen.findByText('Davomatni yuritish'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalled());
  });

  it("video_url yo'q — ochilmaydi, xabar beriladi, hisoblagich yuborilmaydi", async () => {
    await renderWithProviders(<VideoGuideScreen />);
    await fireEvent.press(await screen.findByText('Buyruq yaratish'));
    await waitFor(() => expect(getToasts().map((x) => x.message)).toContain(i18n.t('videoGuide.noVideo')));
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(mock.history.post).toHaveLength(0);
  });

  it("xavfli sxemali URL (javascript:) — ochilmaydi", async () => {
    mock.onGet(VIDEO_GUIDES).reply(200, { items: [{ id: 3, title: 'Zararli', view_count: 0, video_url: 'javascript:alert(1)' }] });
    await renderWithProviders(<VideoGuideScreen />);
    await fireEvent.press(await screen.findByText('Zararli'));
    await waitFor(() => expect(getToasts().length).toBeGreaterThan(0));
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it("so'rov xato — ErrorState", async () => {
    mock.onGet(VIDEO_GUIDES).reply(500);
    await renderWithProviders(<VideoGuideScreen />);
    expect(await screen.findByText(i18n.t('errors.generic'))).toBeTruthy();
  });
});
