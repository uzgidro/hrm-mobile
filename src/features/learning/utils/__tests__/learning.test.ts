import { clampProgress, courseAction, isSafeLink, lessonDone, nextLesson } from '../learning';

describe('learning utils (v2 LearningPage / CoursePlayer)', () => {
  it('kurs amali: yozilgan — «yozilgan»; ochiq yozilish — «yozilish»; aks holda yopiq', () => {
    const enrolled = new Set([1]);
    expect(courseAction({ id: 1, is_open_enrollment: true }, enrolled)).toBe('enrolled');
    expect(courseAction({ id: 2, is_open_enrollment: true }, enrolled)).toBe('enroll');
    expect(courseAction({ id: 3, is_open_enrollment: false }, enrolled)).toBe('closed');
    expect(courseAction({ id: 4 }, enrolled)).toBe('closed');
  });

  it("progress 0..100 ga qisiladi; yo'q/NaN — 0 (darssiz kurs buzuq ko'rinmasin)", () => {
    expect(clampProgress(42)).toBe(42);
    expect(clampProgress(140)).toBe(100);
    expect(clampProgress(-5)).toBe(0);
    expect(clampProgress(null)).toBe(0);
    expect(clampProgress('abc' as never)).toBe(0);
    expect(clampProgress('55.5' as never)).toBe(55.5);
  });

  it('dars bajarilganmi / keyingi bajarilmagan dars', () => {
    const lessons = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(lessonDone(2, [2, 3])).toBe(true);
    expect(lessonDone(1, undefined)).toBe(false);
    expect(nextLesson(lessons, [1])?.id).toBe(2);
    expect(nextLesson(lessons, [1, 2, 3])).toBeNull();
    expect(nextLesson([], [])).toBeNull();
  });

  it('havolalar faqat http(s)', () => {
    expect(isSafeLink('https://cdn/x.mp4')).toBe(true);
    expect(isSafeLink('javascript:alert(1)')).toBe(false);
    expect(isSafeLink('intent://x')).toBe(false);
    expect(isSafeLink(null)).toBe(false);
  });
});
