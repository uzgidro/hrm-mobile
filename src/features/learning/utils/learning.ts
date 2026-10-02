// O'quv markazi — tashkilotning O'Z kurslari, darslari va testlari (web v2
// `LearningPage` / `CoursePlayer`). Malaka oshirish (tashqi yozuvlar) va LMS
// integratsiyasi (tashqi platforma) dan farqli modul.

export type CourseAction = 'enrolled' | 'enroll' | 'closed';

/** Kurs kartasidagi amal: yozilgan / ochiq yozilish mumkin / yopiq (faqat tayinlash orqali). */
export function courseAction(c: { id: number; is_open_enrollment?: boolean }, enrolledIds: Set<number>): CourseAction {
  if (enrolledIds.has(c.id)) return 'enrolled';
  return c.is_open_enrollment ? 'enroll' : 'closed';
}

/** Progress 0..100; darssiz kurs 0 qaytaradi va buzuq ko'rinmasligi kerak. */
export function clampProgress(v: number | string | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

export const lessonDone = (lessonId: number, done: number[] | undefined): boolean => (done ?? []).includes(lessonId);

export function nextLesson<T extends { id: number }>(lessons: T[], done: number[] | undefined): T | null {
  return lessons.find((l) => !lessonDone(l.id, done)) ?? null;
}

/** Dars havolalari serverdan keladi va `Linking.openURL` ga beriladi — faqat http(s). */
export function isSafeLink(url?: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url.trim());
}
