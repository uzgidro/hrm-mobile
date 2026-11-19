import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import { LEARNING_COURSE, LEARNING_COURSE_ENROLL, LEARNING_META, LEARNING_MY } from '@/api/urls';
import CourseLandingScreen from '../screens/CourseLandingScreen';

const mockPush = jest.fn();
let mockParams: Record<string, string> = { id: '1' };
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), canGoBack: () => true, navigate: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

// New API: sections, outcomes, outline-only lessons, the caller's own enrollment.
const NEW_COURSE = {
  id: 1,
  title: 'Mehnat muhofazasi',
  description: 'Asosiy qoidalar',
  is_published: true,
  is_open_enrollment: true,
  lesson_count: 3,
  question_count: 5,
  pass_score: 70,
  total_minutes: 95,
  enrolled: 12,
  outcomes: ["Xavfsizlik qoidalarini qo'llay oladi"],
  cover_url: null,
  can_manage: false,
  sections: [
    { id: 20, title: '2-modul. Amaliyot', position: 1 },
    { id: 10, title: '1-modul. Kirish', position: 0 },
  ],
  lessons: [
    { id: 101, title: 'Kirish darsi', lesson_type: 'video', section_id: 10, position: 0, duration_minutes: 10 },
    { id: 102, title: 'Amaliy mashg‘ulot', lesson_type: 'text', section_id: 20, position: 0 },
    { id: 103, title: 'Bilim tekshiruvi', lesson_type: 'quiz', section_id: 20, position: 1 },
  ],
  my_enrollment: null,
};

describe('CourseLandingScreen (v2 CourseLandingPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mockPush.mockClear();
    mockParams = { id: '1' };
    mock.onGet(LEARNING_META).reply(200, { is_manager: false, training_types: [] });
    mock.onGet(LEARNING_MY).reply(200, []);
  });
  afterEach(() => mock.reset());

  it("bo'limlar tartibda, natijalar, «Kursga yozilish» → POST → pleyer", async () => {
    mock.onGet(LEARNING_COURSE(1)).reply(200, NEW_COURSE);
    mock.onPost(LEARNING_COURSE_ENROLL(1)).reply(201, { id: 55, course_id: 1, status: 'assigned' });
    await renderWithProviders(<CourseLandingScreen />);
    expect(await screen.findByText('1-modul. Kirish')).toBeTruthy();
    expect(screen.getByText('2-modul. Amaliyot')).toBeTruthy();
    // Numbered across sections in section order.
    expect(screen.getByText('1. Kirish darsi')).toBeTruthy();
    expect(screen.getByText('3. Bilim tekshiruvi')).toBeTruthy();
    expect(screen.getByText("Xavfsizlik qoidalarini qo'llay oladi")).toBeTruthy();
    expect(screen.getByText(i18n.t('learning.how3Test', { score: 70 }))).toBeTruthy();
    expect(screen.queryByTestId('landing-builder')).toBeNull();
    await fireEvent.press(screen.getByTestId('landing-enroll'));
    await waitFor(() => expect(mock.history.post[0]?.url).toBe(LEARNING_COURSE_ENROLL(1)));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith({ pathname: '/kurs-player', params: { id: '55' } }));
  });

  it('o‘z yozuvi bor — «Davom etish» pleyerni ochadi; menejerga «Konstruktor»', async () => {
    mock.onGet(LEARNING_COURSE(1)).reply(200, {
      ...NEW_COURSE,
      can_manage: true,
      my_enrollment: { id: 9, course_id: 1, status: 'in_progress', progress: 40 },
    });
    await renderWithProviders(<CourseLandingScreen />);
    await fireEvent.press(await screen.findByTestId('landing-cta'));
    expect(screen.getByText(i18n.t('learning.continue'))).toBeTruthy();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/kurs-player', params: { id: '9' } });
    await fireEvent.press(screen.getByTestId('landing-builder'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/kurs-tahrir', params: { id: '1' } });
  });

  it("ESKI API: sections/my_enrollment yo'q — tekis ro'yxat, yozuv «Mening kurslarim»dan topiladi", async () => {
    mock.onGet(LEARNING_COURSE(1)).reply(200, {
      id: 1,
      title: 'Eski kurs',
      is_published: true,
      is_open_enrollment: true,
      lesson_count: 2,
      question_count: 0,
      lessons: [
        { id: 1, title: 'Birinchi', lesson_type: 'text', content: 'x' },
        { id: 2, title: 'Ikkinchi', lesson_type: 'video', video_url: 'https://cdn/v.mp4' },
      ],
    });
    mock.onGet(LEARNING_MY).reply(200, [{ id: 31, course_id: 1, status: 'completed', progress: 100 }]);
    // Old meta: a manager flag only, no per-course `can_manage`.
    mock.onGet(LEARNING_META).reply(200, { is_manager: true });
    await renderWithProviders(<CourseLandingScreen />);
    expect(await screen.findByText('1. Birinchi')).toBeTruthy();
    expect(screen.getByText('2. Ikkinchi')).toBeTruthy();
    expect(screen.queryByText(i18n.t('learning.looseLessons'))).toBeNull();
    await waitFor(() => expect(screen.getByText(i18n.t('learning.review'))).toBeTruthy());
    await fireEvent.press(screen.getByTestId('landing-cta'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/kurs-player', params: { id: '31' } });
    expect(screen.getByTestId('landing-builder')).toBeTruthy();
  });

  it('yopiq yozilish — tugma yo‘q, «Biriktirish orqali»', async () => {
    mock.onGet(LEARNING_COURSE(1)).reply(200, { ...NEW_COURSE, is_open_enrollment: false });
    await renderWithProviders(<CourseLandingScreen />);
    expect(await screen.findByText(i18n.t('learning.byAssignment'))).toBeTruthy();
    expect(screen.queryByTestId('landing-enroll')).toBeNull();
  });

  it('404 — «Kurs topilmadi»', async () => {
    mock.onGet(LEARNING_COURSE(1)).reply(404, { detail: 'Kurs topilmadi' });
    await renderWithProviders(<CourseLandingScreen />);
    expect(await screen.findByText(i18n.t('learning.courseNotFound'))).toBeTruthy();
  });
});
