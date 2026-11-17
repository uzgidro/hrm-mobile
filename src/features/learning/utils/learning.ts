// O'quv markazi — tashkilotning O'Z kurslari, darslari va testlari (web v2
// `LearningPage` / `CoursePlayerPage` / `CourseBuilderPage`). Malaka oshirish
// (tashqi yozuvlar) va LMS integratsiyasi (tashqi platforma) dan farqli modul.
import dayjs from 'dayjs';
import { isTrustedAppUrl } from '@/lib/trustedUrl';
import type { LearningLesson, LearningSection } from '../api/queries';

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

/**
 * CAPABILITY DETECTION (old vs new learning API).
 *
 * The 2026-11-17 backend added sections, quiz lessons, the resume point, the
 * cover, outcomes, the publish checklist and question/enrollment edits. The
 * app ships via OTA before PROD gets that backend, so the client must work
 * against both. The cheapest reliable signal needs no extra request: the new
 * API ALWAYS returns a `sections` array on course detail and enrollment detail
 * (empty when the course has none), the old one never does. Screens show the
 * new features only when it is there; endpoints that are still called
 * speculatively (the resume `view` ping) ignore 404/405.
 */
export function hasCurriculumApi(detail?: { sections?: unknown } | null): boolean {
  return Array.isArray(detail?.sections);
}

/* ── curriculum ──────────────────────────────────────────────────────── */

export type CurriculumGroup = { section: LearningSection | null; lessons: LearningLesson[] };

const byPos = (a: LearningLesson, b: LearningLesson) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id;

/**
 * Curriculum grouped the way the builder and the player draw it: an optional
 * ungrouped block first, then each section in order. Without sections (old API)
 * it is a single flat group in the server's order.
 */
export function groupCurriculum(sections: LearningSection[] | undefined, lessons: LearningLesson[] | undefined): CurriculumGroup[] {
  const all = lessons ?? [];
  if (!sections) return [{ section: null, lessons: all }];
  const secs = sections.slice().sort((a, b) => a.position - b.position || a.id - b.id);
  const known = new Set(secs.map((s) => s.id));
  const loose = all.filter((l) => l.section_id == null || !known.has(l.section_id)).sort(byPos);
  const out: CurriculumGroup[] = [];
  if (loose.length || secs.length === 0) out.push({ section: null, lessons: loose });
  for (const s of secs) out.push({ section: s, lessons: all.filter((l) => l.section_id === s.id).sort(byPos) });
  return out;
}

/** Flat lesson order (matches the server's `ordered_lessons`). */
export function flatCurriculum(sections: LearningSection[] | undefined, lessons: LearningLesson[] | undefined): LearningLesson[] {
  return groupCurriculum(sections, lessons).flatMap((g) => g.lessons);
}

/** Section-and-lesson order as the `PUT /curriculum` body. */
export type CurriculumPlan = { sid: number | null; ids: number[] }[];

export function curriculumPlan(groups: CurriculumGroup[]): CurriculumPlan {
  const p: CurriculumPlan = groups.map((g) => ({ sid: g.section?.id ?? null, ids: g.lessons.map((l) => l.id) }));
  if (!p.some((x) => x.sid === null)) p.unshift({ sid: null, ids: [] });
  return p;
}

export function planBody(p: CurriculumPlan) {
  return {
    loose_lesson_ids: p.find((x) => x.sid === null)?.ids ?? [],
    sections: p.filter((x) => x.sid !== null).map((x) => ({ id: x.sid as number, lesson_ids: x.ids })),
  };
}

/** Swap a lesson with its neighbour inside its group; null when it is already at the edge. */
export function nudgeLesson(p: CurriculumPlan, lessonId: number, dir: -1 | 1): CurriculumPlan | null {
  const next = p.map((x) => ({ ...x, ids: [...x.ids] }));
  const g = next.find((x) => x.ids.includes(lessonId));
  if (!g) return null;
  const i = g.ids.indexOf(lessonId);
  const j = i + dir;
  if (j < 0 || j >= g.ids.length) return null;
  [g.ids[i], g.ids[j]] = [g.ids[j]!, g.ids[i]!];
  return next;
}

/** Swap a section with its neighbour; the ungrouped block stays first. */
export function nudgeSection(p: CurriculumPlan, sid: number, dir: -1 | 1): CurriculumPlan | null {
  const loose = p.find((x) => x.sid === null) ?? { sid: null, ids: [] };
  const secs = p.filter((x) => x.sid !== null).map((x) => ({ ...x }));
  const i = secs.findIndex((x) => x.sid === sid);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= secs.length) return null;
  [secs[i], secs[j]] = [secs[j]!, secs[i]!];
  return [loose, ...secs];
}

/* ── player ──────────────────────────────────────────────────────────── */

export type PlayerView = number | 'test' | 'done';

/**
 * Where the player opens: a valid deep-linked lesson → finish screen for a
 * completed course → the final test once every lesson is done → the resume
 * point (`last_lesson_id`, new API) if it is unfinished → the first unfinished
 * lesson → the first lesson.
 */
export function initialPlayerView(
  e: { status?: string; has_test?: boolean; last_lesson_id?: number | null; completed_lesson_ids?: number[] },
  lessons: { id: number }[],
  requested?: string | null,
): PlayerView | null {
  if (requested === 'test' && e.has_test) return 'test';
  if (requested === 'done') return 'done';
  const asked = Number(requested);
  if (requested && lessons.some((l) => l.id === asked)) return asked;
  const done = new Set(e.completed_lesson_ids ?? []);
  if (e.status === 'completed') return 'done';
  const allDone = lessons.length > 0 && lessons.every((l) => done.has(l.id));
  if (allDone && e.has_test) return 'test';
  const pick =
    lessons.find((l) => l.id === e.last_lesson_id && !done.has(l.id)) ?? lessons.find((l) => !done.has(l.id)) ?? lessons[0];
  return pick?.id ?? null;
}

/** "1 soat 25 daqiqa" style — minutes are what lessons store. */
export function splitMinutes(total?: number | null): { h: number; m: number } {
  const n = Math.max(0, Number(total) || 0);
  return { h: Math.floor(n / 60), m: n % 60 };
}

/** Deadline state of an unfinished enrollment: overdue / due within 7 days. */
export function deadlineState(e: { deadline?: string | null; status?: string }, today = dayjs()): 'overdue' | 'soon' | null {
  if (!e.deadline || e.status === 'completed') return null;
  const left = dayjs(e.deadline).startOf('day').diff(today.startOf('day'), 'day');
  if (left < 0) return 'overdue';
  if (left <= 7) return 'soon';
  return null;
}

export const STATUS_TONE: Record<string, 'success' | 'brand' | 'neutral' | 'danger'> = {
  completed: 'success',
  in_progress: 'brand',
  assigned: 'neutral',
  failed: 'danger',
};

export const KNOWN_STATUSES = ['assigned', 'in_progress', 'completed', 'failed'] as const;

/* ── media ───────────────────────────────────────────────────────────── */

export type FileKind = 'video' | 'audio' | 'pdf' | 'image' | 'other';

/** Classify by file name (the presigned URL carries no reliable type). */
export function fileKind(name?: string | null, url?: string | null): FileKind {
  const src = (name || url || '').toLowerCase().split('?')[0] ?? '';
  const ext = src.slice(src.lastIndexOf('.') + 1);
  if (['mp4', 'webm', 'mov', 'm4v', 'ogv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'image';
  return 'other';
}

/**
 * A video plays INSIDE the app (the `/media` WebView player) only when it is a
 * direct file on our own domain (MinIO); YouTube / Vimeo and foreign links go
 * to the system browser / their app.
 */
export function playsInApp(url?: string | null, name?: string | null): url is string {
  return isTrustedAppUrl(url) && ['video', 'audio'].includes(fileKind(name, url));
}

export function formatBytes(n?: number | null): string {
  const v = Number(n) || 0;
  if (v <= 0) return '';
  if (v < 1024 * 1024) return `${Math.max(1, Math.round(v / 1024))} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

/** Does a lesson carry anything to show (manager hint «Mazmun yo'q» on the old API). */
export function lessonHasMaterial(l: LearningLesson): boolean {
  if (l.lesson_type === 'quiz') return (l.question_count ?? l.questions?.length ?? 0) > 0;
  return !!(l.content?.trim() || l.video_url || l.file_url || l.file_name);
}

/** Option ids for a new question: o0, o1… skipping ones already used. */
export function nextOptionId(used: string[]): string {
  let i = used.length;
  while (used.includes(`o${i}`)) i += 1;
  return `o${i}`;
}

export const fmtDate = (iso?: string | null): string => (iso ? dayjs(iso.slice(0, 10)).format('DD.MM.YYYY') : '—');
