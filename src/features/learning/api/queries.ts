// Learning center reads (web v2 `useLearning.ts`).
//
// BACKWARD COMPATIBILITY: the app ships over OTA while PROD may still run the
// pre-2026-11-17 learning API. Every field added by the redesign (sections,
// outcomes, cover, last_lesson_id, my_enrollment, readiness, can_manage, quiz
// questions…) is therefore optional here, and screens decide what to show with
// `hasCurriculumApi()` in `utils/learning.ts`.
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import {
  LEARNING_COURSE,
  LEARNING_COURSE_ENROLLMENTS,
  LEARNING_COURSE_QUESTIONS,
  LEARNING_COURSES,
  LEARNING_ENROLLMENT,
  LEARNING_META,
  LEARNING_MY,
  LEARNING_TEST,
} from '@/api/urls';

export type LessonType = 'text' | 'video' | 'file' | 'quiz';

export interface LearningCourse {
  id: number;
  title: string;
  description?: string | null;
  provider?: string | null;
  training_type?: string | null;
  hours?: number | null;
  organization_branch_id?: number | null;
  is_open_enrollment?: boolean;
  is_published?: boolean;
  pass_score?: number | null;
  certificate_validity_months?: number | null;
  is_candidate_course?: boolean;
  test_minutes?: number | null;
  test_question_count?: number | null;
  lesson_count?: number;
  question_count?: number;
  section_count?: number;
  total_minutes?: number;
  outcomes?: string[] | null;
  cover_url?: string | null;
  enrolled?: number;
  completed?: number;
  /** Server-decided per course (new API only); undefined on the old API. */
  can_manage?: boolean;
}

export interface LearningSection {
  id: number;
  course_id?: number;
  title: string;
  position: number;
}

export interface LearningQuestion {
  id: number;
  text?: string | null;
  options?: { id?: string; text?: string }[] | null;
  /** Editor view only — the learner view never carries the answer key. */
  correct_ids?: string[] | null;
  position?: number | null;
  lesson_id?: number | null;
  /** Learner view: more than one right option. */
  multiple?: boolean;
}

export interface LearningLesson {
  id: number;
  course_id?: number;
  title?: string | null;
  lesson_type?: LessonType | string | null;
  content?: string | null;
  video_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_url?: string | null;
  duration_minutes?: number | null;
  position?: number | null;
  section_id?: number | null;
  question_count?: number;
  /** Quiz lesson in the player (no answer key). */
  questions?: LearningQuestion[];
}

export interface ReadinessItem {
  key: 'title' | 'lessons' | 'lesson_content' | 'description' | 'cover' | 'final_test' | string;
  ok: boolean;
  blocking: boolean;
  lesson_ids?: number[];
}

export interface LearningEnrollment {
  id: number;
  course_id: number;
  employee_id?: number;
  employee_name?: string | null;
  employee_photo_thumb_path?: string | null;
  employee_photo_path?: string | null;
  course_title?: string | null;
  provider?: string | null;
  hours?: number | null;
  status: string;
  status_label?: string | null;
  progress?: number | null;
  score?: number | null;
  attempts?: number | null;
  deadline?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  certificate_number?: string | null;
  certificate_expires_at?: string | null;
  last_lesson_id?: number | null;
  last_activity_at?: string | null;
  lesson_count?: number;
  total_minutes?: number;
  cover_url?: string | null;
  training_type?: string | null;
}

export interface CourseDetail extends LearningCourse {
  sections?: LearningSection[];
  lessons?: LearningLesson[];
  readiness?: ReadinessItem[];
  my_enrollment?: LearningEnrollment | null;
}

export interface EnrollmentDetail extends LearningEnrollment {
  description?: string | null;
  outcomes?: string[];
  sections?: LearningSection[];
  lessons?: LearningLesson[];
  completed_lesson_ids?: number[];
  has_test?: boolean;
  test_question_count?: number;
  pass_score?: number | null;
}

export interface QuizResult {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  pass_score?: number | null;
  results?: { question_id: number; correct: boolean; correct_ids?: string[] }[];
  certificate_number?: string | null;
  status?: string;
  progress?: number | null;
}

export interface LearningMeta {
  isManager: boolean;
  trainingTypes: { value: string; label: string }[];
  lessonTypes: { value: string; label: string }[];
}

export const learningKeys = {
  all: ['learning'] as const,
  meta: () => [...learningKeys.all, 'meta'] as const,
  my: () => [...learningKeys.all, 'my'] as const,
  courses: (p: object) => [...learningKeys.all, 'courses', p] as const,
  course: (id: number) => [...learningKeys.all, 'course', id] as const,
  enrollment: (id: number) => [...learningKeys.all, 'enrollment', id] as const,
  test: (enrollmentId: number) => [...learningKeys.all, 'test', enrollmentId] as const,
  questions: (courseId: number, lessonId: number | null) => [...learningKeys.all, 'questions', courseId, lessonId] as const,
  roster: (courseId: number) => [...learningKeys.all, 'roster', courseId] as const,
};

type MetaBody = {
  is_manager?: boolean;
  training_types?: { value: string; label: string }[];
  lesson_types?: { value: string; label: string }[];
};

/** Menejer bayrog'i SERVERdan (filialdagi `lms_manager` roli /auth/me da yo'q) — mijoz o'zi chiqarmaydi. */
export function learningMetaQuery() {
  return queryOptions({
    queryKey: learningKeys.meta(),
    queryFn: () =>
      apiClient.get<MetaBody>(LEARNING_META).then(
        (r): LearningMeta => ({
          isManager: !!r.data?.is_manager,
          trainingTypes: Array.isArray(r.data?.training_types) ? r.data.training_types : [],
          lessonTypes: Array.isArray(r.data?.lesson_types) ? r.data.lesson_types : [],
        }),
      ),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

export function myEnrollmentsQuery() {
  return queryOptions({
    queryKey: learningKeys.my(),
    queryFn: () => apiClient.get(LEARNING_MY).then((r) => unwrapList<LearningEnrollment>(r.data)),
    retry: false,
  });
}

/** Qidiruv serverda; menejer qoralamalarni ham ko'radi (`all_states`), boshqalarga server e'tibor bermaydi. */
export function learningCoursesQuery(f: { search: string; allStates: boolean }, enabled = true) {
  const params: Record<string, string | boolean> = {};
  if (f.search.trim()) params.search = f.search.trim();
  if (f.allStates) params.all_states = true;
  return queryOptions({
    queryKey: learningKeys.courses(params),
    queryFn: () => apiClient.get(LEARNING_COURSES, { params }).then((r) => unwrapList<LearningCourse>(r.data)),
    enabled,
    retry: false,
  });
}

/** One course: sections + lessons (outline only for a learner on the new API). */
export function courseQuery(id: number) {
  return queryOptions({
    queryKey: learningKeys.course(id),
    queryFn: () => apiClient.get<CourseDetail>(LEARNING_COURSE(id)).then((r) => r.data),
    enabled: id > 0,
    retry: false,
  });
}

export function enrollmentQuery(id: number) {
  return queryOptions({
    queryKey: learningKeys.enrollment(id),
    queryFn: () => apiClient.get<EnrollmentDetail>(LEARNING_ENROLLMENT(id)).then((r) => r.data),
    enabled: id > 0,
    retry: false,
  });
}

/** Final test questions — learner view, never the answer key. */
export function finalTestQuery(enrollmentId: number, enabled: boolean) {
  return queryOptions({
    queryKey: learningKeys.test(enrollmentId),
    queryFn: () => apiClient.get(LEARNING_TEST(enrollmentId)).then((r) => unwrapList<LearningQuestion>(r.data)),
    enabled: enabled && enrollmentId > 0,
    retry: false,
    // A retake must not reuse a stale question set.
    gcTime: 0,
  });
}

/** Editor view (WITH the answer key): final test (`lessonId` null) or one quiz lesson. */
export function courseQuestionsQuery(courseId: number, lessonId: number | null, enabled = true) {
  const params = lessonId ? { lesson_id: lessonId } : undefined;
  return queryOptions({
    queryKey: learningKeys.questions(courseId, lessonId),
    queryFn: () =>
      apiClient.get(LEARNING_COURSE_QUESTIONS(courseId), { params }).then((r) => unwrapList<LearningQuestion>(r.data)),
    enabled: enabled && courseId > 0,
    retry: false,
  });
}

/** Course roster (manager). */
export function courseEnrollmentsQuery(courseId: number, enabled = true) {
  return queryOptions({
    queryKey: learningKeys.roster(courseId),
    queryFn: () => apiClient.get(LEARNING_COURSE_ENROLLMENTS(courseId)).then((r) => unwrapList<LearningEnrollment>(r.data)),
    enabled: enabled && courseId > 0,
    retry: false,
  });
}
