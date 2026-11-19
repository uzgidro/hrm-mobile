import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/renderWithProviders';
import i18n from '@/i18n';
import {
  LEARNING_COURSE,
  LEARNING_COURSE_CURRICULUM,
  LEARNING_COURSE_ENROLLMENTS,
  LEARNING_COURSE_LESSONS,
  LEARNING_COURSE_QUESTIONS,
  LEARNING_COURSE_SECTIONS,
  LEARNING_LESSON,
  LEARNING_META,
} from '@/api/urls';
import CourseBuilderScreen from '../screens/CourseBuilderScreen';
import LessonEditorScreen from '../screens/LessonEditorScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = { id: '1' };
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: () => mockBack(), canGoBack: () => true, navigate: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

const NEW_COURSE = {
  id: 1,
  title: 'Mehnat muhofazasi',
  is_published: false,
  can_manage: true,
  lesson_count: 3,
  question_count: 0,
  pass_score: 60,
  outcomes: ['Birinchi natija'],
  readiness: [
    { key: 'title', ok: true, blocking: true },
    { key: 'lessons', ok: true, blocking: true },
    { key: 'lesson_content', ok: true, blocking: true, lesson_ids: [] },
    { key: 'cover', ok: false, blocking: false },
  ],
  sections: [
    { id: 10, title: '1-modul', position: 0 },
    { id: 20, title: '2-modul', position: 1 },
  ],
  lessons: [
    { id: 101, title: 'Kirish', lesson_type: 'text', content: 'x', section_id: 10, position: 0 },
    { id: 102, title: 'Video', lesson_type: 'video', video_url: 'https://youtu.be/a', section_id: 10, position: 1 },
    { id: 103, title: 'Test darsi', lesson_type: 'quiz', section_id: 20, position: 0, question_count: 1 },
  ],
};

// Pre-2026-11-17 API: no sections, no readiness, no can_manage, no outcomes.
const OLD_COURSE = {
  id: 1,
  title: 'Eski kurs',
  is_published: true,
  lesson_count: 2,
  question_count: 0,
  lessons: [
    { id: 1, title: 'Birinchi', lesson_type: 'text', content: 'a', position: 0 },
    { id: 2, title: 'Ikkinchi', lesson_type: 'text', content: 'b', position: 0 },
  ],
};

const formOf = (data: unknown) => data as FormData;
// One adapter for the file: a second `new MockAdapter(apiClient)` would replace the first.
const mock = new MockAdapter(apiClient);

describe('CourseBuilderScreen (v2 CourseBuilderPage)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mockPush.mockClear();
    mockBack.mockClear();
    mockParams = { id: '1' };
    mock.onGet(LEARNING_META).reply(200, { is_manager: true, training_types: [{ value: 'course', label: 'Kurs' }] });
    mock.onGet(LEARNING_COURSE_ENROLLMENTS(1)).reply(200, []);
    mock.onGet(LEARNING_COURSE_QUESTIONS(1)).reply(200, []);
  });
  afterEach(() => mock.reset());

  it("bo'lim qo'shish → POST {title}; dars pastga → PUT curriculum (butun tartib); bo'lim yuqoriga → PUT", async () => {
    mock.onGet(LEARNING_COURSE(1)).reply(200, NEW_COURSE);
    mock.onPost(LEARNING_COURSE_SECTIONS(1)).reply(201, { id: 30, title: '3-modul', position: 2 });
    mock.onPut(LEARNING_COURSE_CURRICULUM(1)).reply(200, NEW_COURSE);
    await renderWithProviders(<CourseBuilderScreen />);
    expect(await screen.findByTestId('builder-lesson-101')).toBeTruthy();
    expect(screen.getByTestId('publish-checklist')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('add-section'));
    await fireEvent.changeText(await screen.findByTestId('section-title'), ' 3-modul ');
    await fireEvent.press(screen.getByTestId('section-title-submit'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({ title: '3-modul' });

    await fireEvent.press(screen.getByTestId('lesson-down-101'));
    await waitFor(() => expect(mock.history.put).toHaveLength(1));
    expect(JSON.parse(mock.history.put[0]!.data)).toEqual({
      loose_lesson_ids: [],
      sections: [
        { id: 10, lesson_ids: [102, 101] },
        { id: 20, lesson_ids: [103] },
      ],
    });

    await fireEvent.press(screen.getByTestId('section-up-20'));
    await waitFor(() => expect(mock.history.put).toHaveLength(2));
    expect(JSON.parse(mock.history.put[1]!.data).sections.map((x: { id: number }) => x.id)).toEqual([20, 10]);
  });

  it("dars qo'shish → multipart (title, lesson_type, section_id) → dars muharriri", async () => {
    mock.onGet(LEARNING_COURSE(1)).reply(200, NEW_COURSE);
    mock.onPost(LEARNING_COURSE_LESSONS(1)).reply(201, { id: 150, title: 'Yangi' });
    await renderWithProviders(<CourseBuilderScreen />);
    await fireEvent.press(await screen.findByTestId('add-lesson-20'));
    await fireEvent.press(await screen.findByText(i18n.t('learning.lessonType_quiz')));
    await fireEvent.changeText(screen.getByTestId('new-lesson-title'), 'Yangi');
    await fireEvent.press(screen.getByTestId('new-lesson-submit'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    const fd = formOf(mock.history.post[0]!.data);
    expect(fd.get('title')).toBe('Yangi');
    expect(fd.get('lesson_type')).toBe('quiz');
    expect(fd.get('section_id')).toBe('20');
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/kurs-dars', params: { course: '1', id: '150' } }),
    );
  });

  it("e'lon qilish → PATCH {is_published: true}; yakuniy test savoli → POST (lesson_id yo'q)", async () => {
    mock.onGet(LEARNING_COURSE(1)).reply(200, NEW_COURSE);
    mock.onPatch(LEARNING_COURSE(1)).reply(200, { ...NEW_COURSE, is_published: true });
    mock.onPost(LEARNING_COURSE_QUESTIONS(1)).reply(201, { id: 5 });
    await renderWithProviders(<CourseBuilderScreen />);
    await fireEvent.press(await screen.findByTestId('builder-publish'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0]!.data)).toEqual({ is_published: true });

    await fireEvent.press(screen.getByText(i18n.t('learning.tabFinalTest')));
    await fireEvent.press(await screen.findByTestId('question-add'));
    await fireEvent.changeText(await screen.findByTestId('question-text'), 'Asosiy qoida?');
    await fireEvent.changeText(screen.getByTestId('option-text-0'), 'Ha');
    await fireEvent.changeText(screen.getByTestId('option-text-1'), "Yo'q");
    await fireEvent.press(screen.getByTestId('question-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      text: 'Asosiy qoida?',
      options: [
        { id: 'a', text: 'Ha' },
        { id: 'b', text: "Yo'q" },
      ],
      correct_ids: ['a'],
      position: 0,
    });
  });

  it('kurs sahifasi: PATCH tanasida natijalar (outcomes) bor', async () => {
    mock.onGet(LEARNING_COURSE(1)).reply(200, NEW_COURSE);
    mock.onPatch(LEARNING_COURSE(1)).reply(200, NEW_COURSE);
    await renderWithProviders(<CourseBuilderScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('learning.tabDetails')));
    await fireEvent.press(await screen.findByTestId('outcome-add'));
    await fireEvent.changeText(screen.getByTestId('outcome-1'), 'Ikkinchi natija');
    await fireEvent.press(screen.getByTestId('details-save'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0]!.data)).toMatchObject({
      title: 'Mehnat muhofazasi',
      outcomes: ['Birinchi natija', 'Ikkinchi natija'],
      pass_score: 60,
    });
  });

  it("ESKI API: bo'lim/quiz/muqova/natija yo'q; dars ko'chirish — PATCH position'lar", async () => {
    mock.onGet(LEARNING_COURSE(1)).reply(200, OLD_COURSE);
    mock.onPatch(LEARNING_LESSON(1)).reply(200, {});
    mock.onPatch(LEARNING_LESSON(2)).reply(200, {});
    mock.onPatch(LEARNING_COURSE(1)).reply(200, OLD_COURSE);
    await renderWithProviders(<CourseBuilderScreen />);
    expect(await screen.findByTestId('builder-lesson-1')).toBeTruthy();
    expect(screen.queryByTestId('add-section')).toBeNull();
    expect(screen.queryByTestId('publish-checklist')).toBeNull();

    // Both start at position 0 (typical of old courses): the new order [2, 1] is written as
    // indexes, and only the lesson whose position actually changes is patched.
    await fireEvent.press(screen.getByTestId('lesson-down-1'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(mock.history.put).toHaveLength(0);
    expect(mock.history.patch[0]!.url).toBe(LEARNING_LESSON(1));
    expect(formOf(mock.history.patch[0]!.data).get('position')).toBe('1');

    await fireEvent.press(screen.getByTestId('add-lesson-loose'));
    expect(await screen.findByTestId('new-lesson-title')).toBeTruthy();
    expect(screen.queryByText(i18n.t('learning.lessonType_quiz'))).toBeNull();
  });

  it("ESKI API kurs sahifasi: muqova/natijalar ko'rinmaydi, PATCH'da outcomes yo'q", async () => {
    mock.onGet(LEARNING_COURSE(1)).reply(200, OLD_COURSE);
    mock.onPatch(LEARNING_COURSE(1)).reply(200, OLD_COURSE);
    await renderWithProviders(<CourseBuilderScreen />);
    await fireEvent.press(await screen.findByText(i18n.t('learning.tabDetails')));
    expect(screen.queryByTestId('cover-upload')).toBeNull();
    expect(screen.queryByTestId('outcome-add')).toBeNull();
    await fireEvent.press(screen.getByTestId('details-save'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(JSON.parse(mock.history.patch[0]!.data)).not.toHaveProperty('outcomes');
  });

  it("boshqarish huquqi yo'q (can_manage=false) — «Kurs topilmadi»", async () => {
    mock.onGet(LEARNING_COURSE(1)).reply(200, { ...NEW_COURSE, can_manage: false });
    await renderWithProviders(<CourseBuilderScreen />);
    expect(await screen.findByText(i18n.t('learning.courseNotFound'))).toBeTruthy();
    expect(screen.queryByTestId('builder-tabs')).toBeNull();
  });
});

describe('LessonEditorScreen (v2 LessonEditor)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uz-Latn');
    mockBack.mockClear();
    mock.onGet(LEARNING_META).reply(200, { is_manager: true });
  });
  afterEach(() => mock.reset());

  it("saqlash → multipart PATCH; bo'shatilgan maydon `clear` bilan", async () => {
    mockParams = { course: '1', id: '102' };
    mock.onGet(LEARNING_COURSE(1)).reply(200, NEW_COURSE);
    mock.onPatch(LEARNING_LESSON(102)).reply(200, {});
    await renderWithProviders(<LessonEditorScreen />);
    await fireEvent.changeText(await screen.findByTestId('lesson-title'), 'Video dars');
    await fireEvent.changeText(screen.getByTestId('lesson-video-url'), '');
    await fireEvent.changeText(screen.getByTestId('lesson-minutes'), '12');
    await fireEvent.press(screen.getByTestId('lesson-save'));
    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    const fd = formOf(mock.history.patch[0]!.data);
    expect(fd.get('title')).toBe('Video dars');
    expect(fd.get('lesson_type')).toBe('video');
    expect(fd.get('duration_minutes')).toBe('12');
    expect(fd.get('video_url')).toBeNull();
    expect(fd.get('clear')).toBe('video_url');
  });

  it("quiz darsi: savollar ro'yxati shu dars uchun (lesson_id), yangi savol lesson_id bilan", async () => {
    mockParams = { course: '1', id: '103' };
    mock.onGet(LEARNING_COURSE(1)).reply(200, NEW_COURSE);
    mock.onGet(LEARNING_COURSE_QUESTIONS(1)).reply(200, [
      { id: 9, text: 'Mavjud savol', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correct_ids: ['b'], lesson_id: 103 },
    ]);
    mock.onPost(LEARNING_COURSE_QUESTIONS(1)).reply(201, { id: 10 });
    mock.onDelete(LEARNING_LESSON(103)).reply(204);
    await renderWithProviders(<LessonEditorScreen />);
    expect(await screen.findByText('1. Mavjud savol')).toBeTruthy();
    expect(mock.history.get.find((r) => r.url === LEARNING_COURSE_QUESTIONS(1))?.params).toEqual({ lesson_id: 103 });
    await fireEvent.press(screen.getByTestId('question-add'));
    await fireEvent.changeText(await screen.findByTestId('question-text'), 'Yangi savol');
    await fireEvent.changeText(screen.getByTestId('option-text-0'), 'X');
    await fireEvent.changeText(screen.getByTestId('option-text-1'), 'Y');
    await fireEvent(screen.getByTestId('option-correct-0'), 'valueChange', false);
    await fireEvent(screen.getByTestId('option-correct-1'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('question-save'));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]!.data)).toEqual({
      text: 'Yangi savol',
      options: [
        { id: 'a', text: 'X' },
        { id: 'b', text: 'Y' },
      ],
      correct_ids: ['b'],
      position: 1,
      lesson_id: 103,
    });

    await fireEvent.press(screen.getByTestId('lesson-delete'));
    await waitFor(() => expect(mock.history.delete.map((r) => r.url)).toEqual([LEARNING_LESSON(103)]));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });
});
