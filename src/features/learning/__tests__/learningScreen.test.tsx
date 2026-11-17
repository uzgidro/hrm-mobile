import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import { LEARNING_COURSE_ENROLL, LEARNING_COURSES, LEARNING_META, LEARNING_MY } from '@/api/urls';
import LearningScreen from '../screens/LearningScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), canGoBack: () => true, navigate: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
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
    deadline: '2099-11-01',
    last_activity_at: '2026-11-16T10:00:00Z',
    lesson_count: 4,
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

describe('LearningScreen (v2 LearningPage hub)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mockPush.mockClear();
    mock.onGet(LEARNING_META).reply(200, { is_manager: false, training_types: [], statuses: [] });
    mock.onGet(LEARNING_MY).reply(200, MY);
    mock.onGet(LEARNING_COURSES).reply(200, [
      { id: 1, title: 'Xavfsizlik texnikasi', hours: 8, is_open_enrollment: true, lesson_count: 3 },
      { id: 2, title: 'Energetika asoslari', hours: 16, is_open_enrollment: true, lesson_count: 5 },
      { id: 3, title: 'Yopiq kurs', is_open_enrollment: false },
    ]);
    mock.onPost(LEARNING_COURSE_ENROLL(2)).reply(201, { id: 77, course_id: 2, status: 'assigned' });
  });
  afterEach(() => mock.reset());

  it('Mening kurslarim: holat, sertifikat; «davom eting» kartasi oxirgi kursni pleyerda ochadi', async () => {
    await renderWithProviders(<LearningScreen />);
    expect(await screen.findByTestId('enrollment-11')).toBeTruthy();
    expect(screen.getAllByText(i18n.t('learning.status_in_progress')).length).toBeGreaterThan(0);
    expect(screen.getByText(/C-77/)).toBeTruthy();
    expect(screen.getByTestId('stat-certs')).toHaveTextContent(/1/);
    await fireEvent.press(screen.getByTestId('continue-hero-cta'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/kurs-player', params: { id: '11' } });
    await fireEvent.press(screen.getByTestId('enrollment-12'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/kurs-player', params: { id: '12' } });
  });

  it('filtr «Tugatilgan» — faqat tugatilgan yozuv', async () => {
    await renderWithProviders(<LearningScreen />);
    await screen.findByTestId('enrollment-11');
    await fireEvent.press(screen.getByTestId('my-filter-completed'));
    expect(screen.queryByTestId('enrollment-11')).toBeNull();
    expect(screen.getByTestId('enrollment-12')).toBeTruthy();
  });

  it("Katalog: yozilgan — «Yozilgan», ochiq — tugma, yopiq — «Biriktirish orqali»; yozilish → POST → pleyer; qator → kurs sahifasi", async () => {
    await renderWithProviders(<LearningScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('learning.tabCatalog')));
    expect(await screen.findByText('Energetika asoslari')).toBeTruthy();
    expect(screen.getByTestId('course-enrolled-1')).toBeTruthy();
    expect(screen.queryByTestId('course-enroll-3')).toBeNull();
    expect(screen.getByText(i18n.t('learning.byAssignment'))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('course-enroll-2'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0]!.url).toBe(LEARNING_COURSE_ENROLL(2));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith({ pathname: '/kurs-player', params: { id: '77' } }));
    await fireEvent.press(screen.getByTestId('course-3'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/kurs-detail', params: { id: '3' } });
  });

  it('qidiruv serverga: katalog `search` param', async () => {
    await renderWithProviders(<LearningScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('learning.tabCatalog')));
    await fireEvent.changeText(screen.getByPlaceholderText(i18n.t('learning.searchPlaceholder')), 'energ');
    await waitFor(() =>
      expect(mock.history.get.filter((r) => r.url === LEARNING_COURSES).at(-1)?.params).toMatchObject({ search: 'energ' }),
    );
  });

  it("menejer bo'lmasa — «Boshqaruv» va «+» yo'q", async () => {
    await renderWithProviders(<LearningScreen />);
    await screen.findByTestId('enrollment-11');
    expect(screen.queryByText(i18n.t('learning.tabManage'))).toBeNull();
    expect(screen.queryByTestId('learning-add-course')).toBeNull();
  });

  it('menejer: Boshqaruv (all_states) → qoralama belgisi, qator → konstruktor; yangi kurs → POST (qoralama) → konstruktor', async () => {
    mock.onGet(LEARNING_META).reply(200, { is_manager: true, training_types: [{ value: 'course', label: 'Kurs' }] });
    mock.onGet(LEARNING_COURSES).reply(200, [
      { id: 5, title: 'Qoralama kurs', is_published: false, lesson_count: 0, enrolled: 0, completed: 0 },
      { id: 6, title: "E'lon qilingan kurs", is_published: true, lesson_count: 2, enrolled: 3, completed: 1 },
    ]);
    mock.onPost(LEARNING_COURSES).reply(201, { id: 42, title: 'Yangi kurs' });
    await renderWithProviders(<LearningScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('learning.tabManage')));
    expect(await screen.findByTestId('manage-course-5')).toBeTruthy();
    expect(mock.history.get.filter((r) => r.url === LEARNING_COURSES).at(-1)?.params).toMatchObject({ all_states: true });
    await fireEvent.press(screen.getByTestId('manage-filter-draft'));
    expect(screen.queryByTestId('manage-course-6')).toBeNull();
    await fireEvent.press(screen.getByTestId('manage-course-5'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/kurs-tahrir', params: { id: '5' } });

    await fireEvent.press(screen.getByTestId('learning-add-course'));
    await fireEvent.changeText(await screen.findByTestId('create-course-title'), '  Yangi kurs ');
    await fireEvent.press(screen.getByTestId('create-course-submit'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toMatchObject({
      title: 'Yangi kurs',
      training_type: 'course',
      is_published: false,
      is_open_enrollment: true,
      pass_score: 60,
    });
    await waitFor(() => expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/kurs-tahrir', params: { id: '42' } }));
  });

  it("bo'sh — bo'sh holat; so'rov xato — ErrorState", async () => {
    mock.onGet(LEARNING_MY).reply(200, []);
    await renderWithProviders(<LearningScreen />);
    expect(await screen.findByText(i18n.t('learning.emptyMine'))).toBeTruthy();
    expect(screen.getByText(i18n.t('learning.heroEmptyTitle'))).toBeTruthy();
  });

  it("Mening kurslarim so'rovi xato — ErrorState", async () => {
    mock.onGet(LEARNING_MY).reply(500);
    await renderWithProviders(<LearningScreen />);
    expect(await screen.findByText(i18n.t('errors.generic'))).toBeTruthy();
  });
});
