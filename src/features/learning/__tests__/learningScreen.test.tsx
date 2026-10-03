import React from 'react';
import { Linking } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import { LEARNING_COURSES, LEARNING_ENROLLMENT, LEARNING_META, LEARNING_MY } from '@/api/urls';
import LearningScreen from '../screens/LearningScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const MY = [
  {
    id: 11,
    course_id: 1,
    employee_id: 5,
    course_title: 'Xavfsizlik texnikasi',
    status: 'in_progress',
    status_label: 'Jarayonda',
    progress: 50,
    deadline: '2026-11-01',
  },
  {
    id: 12,
    course_id: 9,
    employee_id: 5,
    course_title: 'Birinchi yordam',
    status: 'completed',
    status_label: 'Tugallangan',
    progress: 100,
    score: 90,
    certificate_number: 'C-77',
  },
];

describe('LearningScreen (v2 LearningPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mock.onGet(LEARNING_META).reply(200, { is_manager: false, training_types: [], statuses: [] });
    mock.onGet(LEARNING_MY).reply(200, MY);
    mock.onGet(LEARNING_COURSES).reply(200, [
      { id: 1, title: 'Xavfsizlik texnikasi', hours: 8, is_open_enrollment: true, lesson_count: 3 },
      { id: 2, title: 'Energetika asoslari', hours: 16, is_open_enrollment: true, lesson_count: 5 },
      { id: 3, title: 'Yopiq kurs', is_open_enrollment: false },
    ]);
    mock.onPost(`${LEARNING_COURSES}/2/enroll`).reply(200, {});
    mock.onGet(`${LEARNING_ENROLLMENT(11)}`).reply(200, {
      ...MY[0],
      has_test: true,
      completed_lesson_ids: [100],
      lessons: [
        { id: 100, title: 'Kirish', lesson_type: 'text', content: 'Matn dars mazmuni' },
        { id: 101, title: 'Video dars', lesson_type: 'video', video_url: 'https://cdn/v.mp4', duration_minutes: 5 },
        { id: 102, title: 'Zararli', lesson_type: 'file', file_url: 'javascript:alert(1)' },
      ],
    });
    mock.onPost(`${LEARNING_ENROLLMENT(11)}/lessons/101/complete`).reply(200, {});
  });
  afterEach(() => {
    mock.reset();
    jest.restoreAllMocks();
  });

  it('Mening kurslarim: holat, ball, sertifikat, muddat; progress', async () => {
    await renderWithProviders(<LearningScreen />);
    expect(await screen.findByText('Xavfsizlik texnikasi')).toBeTruthy();
    expect(screen.getByText('Jarayonda')).toBeTruthy();
    expect(screen.getByText('Birinchi yordam')).toBeTruthy();
    expect(screen.getByText(/C-77/)).toBeTruthy();
  });

  it("Katalog: yozilgan kurs «yozilgan», ochiq — «Kursga yozilish», yopiq — tugma yo'q; yozilish → POST", async () => {
    await renderWithProviders(<LearningScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('learning.tabCatalog')));
    expect(await screen.findByText('Energetika asoslari')).toBeTruthy();
    expect(screen.getByTestId('course-enrolled-1')).toBeTruthy();
    expect(screen.queryByTestId('course-enroll-3')).toBeNull();
    await fireEvent.press(screen.getByTestId('course-enroll-2'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0].url).toBe(`${LEARNING_COURSES}/2/enroll`);
  });

  it('qidiruv serverga: katalog `search` param', async () => {
    await renderWithProviders(<LearningScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('learning.tabCatalog')));
    await fireEvent.changeText(screen.getByPlaceholderText(i18n.t('learning.searchPlaceholder')), 'energ');
    await waitFor(() =>
      expect(mock.history.get.filter((r) => r.url === LEARNING_COURSES).at(-1)?.params).toMatchObject({
        search: 'energ',
      }),
    );
  });

  it("yozuv tafsiloti: darslar; bajarilgan belgilanadi; video havolasi ochiladi; xavfli havola — yo'q; dars yakunlash → POST", async () => {
    await renderWithProviders(<LearningScreen />);
    await fireEvent.press(await screen.findByText('Xavfsizlik texnikasi'));
    expect(await screen.findByText('Kirish')).toBeTruthy();
    expect(screen.getByTestId('lesson-done-100')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('lesson-open-101'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://cdn/v.mp4'));
    expect(screen.queryByTestId('lesson-open-102')).toBeNull();
    await fireEvent.press(screen.getByTestId('lesson-complete-101'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    // Test topshirish web'da.
    expect(screen.getByText(i18n.t('learning.testWebOnly'))).toBeTruthy();
  });

  it("ikkala ro'yxat bo'sh — bo'sh holat; xato — ErrorState", async () => {
    mock.onGet(LEARNING_MY).reply(200, []);
    await renderWithProviders(<LearningScreen />);
    expect(await screen.findByText(i18n.t('learning.emptyMine'))).toBeTruthy();
  });

  it("Mening kurslarim so'rovi xato — ErrorState", async () => {
    mock.onGet(LEARNING_MY).reply(500);
    await renderWithProviders(<LearningScreen />);
    expect(await screen.findByText(i18n.t('errors.generic'))).toBeTruthy();
  });

  it("yozuv tafsiloti so'rovi xato — cheksiz skelet emas, ErrorState", async () => {
    mock.onGet(LEARNING_ENROLLMENT(11)).reply(404);
    await renderWithProviders(<LearningScreen />);
    await fireEvent.press(await screen.findByText('Xavfsizlik texnikasi'));
    expect((await screen.findAllByText(i18n.t('errors.generic'))).length).toBeGreaterThan(0);
  });
});
