import React from 'react';
import { Linking } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import {
  LEARNING_ENROLLMENT,
  LEARNING_LESSON_COMPLETE,
  LEARNING_LESSON_QUIZ,
  LEARNING_LESSON_VIEW,
  LEARNING_MY,
  LEARNING_TEST,
} from '@/api/urls';
import CoursePlayerScreen from '../screens/CoursePlayerScreen';

const mockPush = jest.fn();
let mockParams: Record<string, string> = { id: '11' };
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), canGoBack: () => true, navigate: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

// New API enrollment: sections, resume point, a quiz lesson (no answer key).
const NEW_ENR = {
  id: 11,
  course_id: 1,
  course_title: 'Mehnat muhofazasi',
  status: 'in_progress',
  progress: 33,
  pass_score: 60,
  has_test: true,
  test_question_count: 2,
  last_lesson_id: 102,
  completed_lesson_ids: [101],
  sections: [{ id: 10, title: '1-modul', position: 0 }],
  lessons: [
    { id: 101, title: 'Kirish', lesson_type: 'text', content: 'Kirish matni', section_id: 10, position: 0 },
    { id: 102, title: 'Video dars', lesson_type: 'video', video_url: 'https://youtu.be/abc', section_id: 10, position: 1 },
    {
      id: 103,
      title: 'Tekshiruv',
      lesson_type: 'quiz',
      section_id: 10,
      position: 2,
      questions: [
        { id: 7, text: '2 + 2 = ?', options: [{ id: 'a', text: '3' }, { id: 'b', text: '4' }], multiple: false },
      ],
    },
  ],
};

describe('CoursePlayerScreen (v2 CoursePlayerPage)', () => {
  const mock = new MockAdapter(apiClient);
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mockPush.mockClear();
    mockParams = { id: '11' };
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mock.onGet(LEARNING_MY).reply(200, []);
    mock.onPost(LEARNING_LESSON_VIEW(11, 102)).reply(200, { last_lesson_id: 102 });
    mock.onPost(LEARNING_LESSON_VIEW(11, 103)).reply(200, { last_lesson_id: 103 });
  });
  afterEach(() => {
    mock.reset();
    jest.restoreAllMocks();
  });

  it('oxirgi ochilgan darsdan davom etadi va resume nuqtasini yuboradi (POST view)', async () => {
    mock.onGet(LEARNING_ENROLLMENT(11)).reply(200, NEW_ENR);
    await renderWithProviders(<CoursePlayerScreen />);
    expect(await screen.findByTestId('player-lesson-title')).toHaveTextContent('Video dars');
    await waitFor(() => expect(mock.history.post.map((r) => r.url)).toContain(LEARNING_LESSON_VIEW(11, 102)));
    // YouTube is not ours — it opens outside the app.
    await fireEvent.press(screen.getByTestId('lesson-video-102'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://youtu.be/abc'));
  });

  it('«Yakunlash va davom etish» → POST complete → keyingi dars (quiz)', async () => {
    mock.onGet(LEARNING_ENROLLMENT(11)).reply(200, NEW_ENR);
    mock.onPost(LEARNING_LESSON_COMPLETE(11, 102)).reply(200, { id: 11, status: 'in_progress', progress: 66 });
    await renderWithProviders(<CoursePlayerScreen />);
    await fireEvent.press(await screen.findByTestId('lesson-complete-102'));
    await waitFor(() => expect(mock.history.post.map((r) => r.url)).toContain(LEARNING_LESSON_COMPLETE(11, 102)));
    await waitFor(() => expect(screen.getByTestId('player-lesson-title')).toHaveTextContent('Tekshiruv'));
    // A quiz lesson has no manual «done» button.
    expect(screen.queryByTestId('lesson-complete-103')).toBeNull();
  });

  it('quiz darsi: javoblar `{ answers: { "<savol>": [variant] } }` bilan yuboriladi; natija ko‘rinadi', async () => {
    mockParams = { id: '11', lesson: '103' };
    mock.onGet(LEARNING_ENROLLMENT(11)).reply(200, NEW_ENR);
    mock.onPost(LEARNING_LESSON_QUIZ(11, 103)).reply(200, {
      score: 100,
      passed: true,
      correct: 1,
      total: 1,
      pass_score: 60,
      results: [{ question_id: 7, correct: true, correct_ids: ['b'] }],
      progress: 100,
      status: 'in_progress',
    });
    await renderWithProviders(<CoursePlayerScreen />);
    await fireEvent.press(await screen.findByTestId('quiz-opt-7-b'));
    await fireEvent.press(screen.getByTestId('quiz-submit'));
    await waitFor(() => expect(mock.history.post.some((r) => r.url === LEARNING_LESSON_QUIZ(11, 103))).toBe(true));
    const req = mock.history.post.find((r) => r.url === LEARNING_LESSON_QUIZ(11, 103))!;
    expect(JSON.parse(req.data)).toEqual({ answers: { '7': ['b'] } });
    expect(await screen.findByTestId('quiz-result')).toBeTruthy();
    expect(screen.getByText(i18n.t('learning.quizPassed'))).toBeTruthy();
  });

  it("ESKI API: sections/last_lesson_id yo'q — tekis ro'yxat, birinchi bajarilmagan dars, view YUBORILMAYDI", async () => {
    mock.onGet(LEARNING_ENROLLMENT(11)).reply(200, {
      id: 11,
      course_id: 1,
      course_title: 'Eski kurs',
      status: 'in_progress',
      progress: 50,
      has_test: false,
      completed_lesson_ids: [1],
      lessons: [
        { id: 1, title: 'Birinchi', lesson_type: 'text', content: 'a' },
        { id: 2, title: 'Ikkinchi', lesson_type: 'file', file_url: 'https://hr.uzgidro.uz/f/a.pdf', file_name: 'a.pdf' },
      ],
    });
    mock.onPost(LEARNING_LESSON_COMPLETE(11, 2)).reply(200, { id: 11, status: 'completed', progress: 100 });
    await renderWithProviders(<CoursePlayerScreen />);
    expect(await screen.findByTestId('player-lesson-title')).toHaveTextContent('Ikkinchi');
    await fireEvent.press(screen.getByTestId('lesson-file-2'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://hr.uzgidro.uz/f/a.pdf'));
    await fireEvent.press(screen.getByTestId('lesson-complete-2'));
    await waitFor(() => expect(mock.history.post.map((r) => r.url)).toEqual([LEARNING_LESSON_COMPLETE(11, 2)]));
    // The last lesson finished the course (no test) — the finish screen.
    expect(await screen.findByText(i18n.t('learning.congrats'))).toBeTruthy();
  });

  it('view 404 qaytarsa ham dars ekrani buzilmaydi', async () => {
    mock.onGet(LEARNING_ENROLLMENT(11)).reply(200, NEW_ENR);
    mock.onPost(LEARNING_LESSON_VIEW(11, 102)).reply(404);
    await renderWithProviders(<CoursePlayerScreen />);
    expect(await screen.findByTestId('player-lesson-title')).toHaveTextContent('Video dars');
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(screen.getByTestId('player-lesson-title')).toBeTruthy();
  });

  it('yakuniy test: darslar tugamagan — qulf; hammasi tugagach — savollar, topshirish → sertifikat', async () => {
    mockParams = { id: '11', lesson: 'test' };
    mock.onGet(LEARNING_ENROLLMENT(11)).reply(200, NEW_ENR);
    const first = await renderWithProviders(<CoursePlayerScreen />);
    expect(await screen.findByTestId('final-test-locked')).toBeTruthy();
    await first.unmount();

    const done = {
      ...NEW_ENR,
      completed_lesson_ids: [101, 102, 103],
      progress: 100,
      employee_name: 'Aliyev Vali',
    };
    mock.onGet(LEARNING_ENROLLMENT(11)).reply(200, done);
    mock.onGet(LEARNING_TEST(11)).reply(200, [
      { id: 1, text: 'Savol 1', options: [{ id: 'a', text: 'Ha' }, { id: 'b', text: "Yo'q" }], multiple: false },
      { id: 2, text: 'Savol 2', options: [{ id: 'a', text: 'A' }, { id: 'c', text: 'C' }], multiple: true },
    ]);
    mock.onPost(LEARNING_TEST(11)).reply(200, { score: 100, passed: true, correct: 2, total: 2, status: 'completed', certificate_number: 'C-1' });
    await renderWithProviders(<CoursePlayerScreen />);
    await fireEvent.press(await screen.findByTestId('final-test-start'));
    await fireEvent.press(await screen.findByTestId('quiz-opt-1-a'));
    await fireEvent.press(screen.getByTestId('quiz-opt-2-a'));
    await fireEvent.press(screen.getByTestId('quiz-opt-2-c'));
    await fireEvent.press(screen.getByTestId('quiz-submit'));
    await waitFor(() => expect(mock.history.post.some((r) => r.url === LEARNING_TEST(11))).toBe(true));
    const req = mock.history.post.find((r) => r.url === LEARNING_TEST(11))!;
    expect(JSON.parse(req.data)).toEqual({ answers: { '1': ['a'], '2': ['a', 'c'] } });

    // The refetch after the test returns the completed enrollment with its certificate.
    mock.onGet(LEARNING_ENROLLMENT(11)).reply(200, {
      ...done,
      status: 'completed',
      score: 100,
      certificate_number: 'C-1',
      completed_at: '2026-11-17',
    });
    await fireEvent.press(await screen.findByTestId('get-certificate'));
    expect(await screen.findByTestId('certificate-card')).toBeTruthy();
    expect(screen.getByTestId('certificate-number')).toHaveTextContent(/C-1/);
    expect(screen.getByText('Aliyev Vali')).toBeTruthy();
  });

  it("yozuv so'rovi xato — «Kurs topilmadi»", async () => {
    mock.onGet(LEARNING_ENROLLMENT(11)).reply(404);
    await renderWithProviders(<CoursePlayerScreen />);
    expect(await screen.findByText(i18n.t('learning.courseNotFound'))).toBeTruthy();
  });
});
