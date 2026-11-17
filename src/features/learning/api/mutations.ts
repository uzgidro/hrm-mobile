// Learning center writes (web v2 `useLearningOps`). Every hook shows its own
// error (toast or inline), so the global mutation toast is switched off.
//
// ⚠️ Lessons are MULTIPART (`Form(...)` + `File(...)` on the server); a JSON
// body gets a 422. Courses, sections, questions and answers are JSON.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { appendFile, type UploadFile } from '@/api/formFile';
import {
  LEARNING_COURSE,
  LEARNING_COURSE_ASSIGN,
  LEARNING_COURSE_COVER,
  LEARNING_COURSE_CURRICULUM,
  LEARNING_COURSE_ENROLL,
  LEARNING_COURSE_LESSONS,
  LEARNING_COURSE_QUESTIONS,
  LEARNING_COURSE_SECTIONS,
  LEARNING_COURSES,
  LEARNING_ENROLLMENT,
  LEARNING_LESSON,
  LEARNING_LESSON_COMPLETE,
  LEARNING_LESSON_QUIZ,
  LEARNING_LESSON_VIEW,
  LEARNING_QUESTION,
  LEARNING_SECTION,
  LEARNING_TEST,
} from '@/api/urls';
import { learningKeys, type CourseDetail, type LearningCourse, type LearningEnrollment, type LearningLesson, type QuizResult } from './queries';

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };
const meta = { skipErrorToast: true };

export type CourseBody = Partial<
  Pick<
    LearningCourse,
    | 'title'
    | 'description'
    | 'provider'
    | 'training_type'
    | 'hours'
    | 'organization_branch_id'
    | 'is_open_enrollment'
    | 'is_published'
    | 'pass_score'
    | 'certificate_validity_months'
    | 'is_candidate_course'
    | 'test_minutes'
    | 'test_question_count'
    | 'outcomes'
  >
>;

/** Lesson form fields; `clear` names fields to empty (new API; the old one ignores it). */
export interface LessonForm {
  title?: string;
  lesson_type?: string;
  content?: string;
  video_url?: string;
  duration_minutes?: number;
  position?: number;
  section_id?: number;
  clear?: string[];
  file?: UploadFile | null;
}

export async function lessonFormData(f: LessonForm): Promise<FormData> {
  const fd = new FormData();
  if (f.title != null) fd.append('title', f.title);
  if (f.lesson_type != null) fd.append('lesson_type', f.lesson_type);
  if (f.content != null) fd.append('content', f.content);
  if (f.video_url != null) fd.append('video_url', f.video_url);
  if (f.duration_minutes != null) fd.append('duration_minutes', String(f.duration_minutes));
  if (f.position != null) fd.append('position', String(f.position));
  if (f.section_id != null) fd.append('section_id', String(f.section_id));
  if (f.clear?.length) fd.append('clear', f.clear.join(','));
  if (f.file) await appendFile(fd, 'file', f.file);
  return fd;
}

export interface QuestionBody {
  text: string;
  options: { id: string; text: string }[];
  correct_ids: string[];
  position?: number;
  lesson_id?: number;
}

export interface CurriculumBody {
  sections: { id: number; lesson_ids: number[] }[];
  loose_lesson_ids: number[];
}

export const enrollInCourse = (courseId: number) =>
  apiClient.post<LearningEnrollment>(LEARNING_COURSE_ENROLL(courseId), {}).then((r) => r.data);
export const completeLesson = (enrollmentId: number, lessonId: number) =>
  apiClient.post<LearningEnrollment>(LEARNING_LESSON_COMPLETE(enrollmentId, lessonId), {}).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: learningKeys.all });
}

/* ── learner ─────────────────────────────────────────────────────────── */

export function useEnroll() {
  const onSuccess = useInvalidate();
  return useMutation({ meta, mutationFn: enrollInCourse, onSuccess });
}

export function useCompleteLesson() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ enrollmentId, lessonId }: { enrollmentId: number; lessonId: number }) =>
      completeLesson(enrollmentId, lessonId),
    onSuccess,
  });
}

/**
 * Resume point. Fire-and-forget: the old API has no such route (404/405) and
 * a failure here must never disturb the lesson on screen.
 */
export function useViewLesson() {
  const qc = useQueryClient();
  return useMutation({
    meta,
    mutationFn: ({ enrollmentId, lessonId }: { enrollmentId: number; lessonId: number }) =>
      apiClient.post(LEARNING_LESSON_VIEW(enrollmentId, lessonId), {}).then((r) => r.data),
    // «Mening kurslarim» is ordered by last activity on the new API.
    onSuccess: () => void qc.invalidateQueries({ queryKey: learningKeys.my() }),
  });
}

export function useSubmitQuiz() {
  const invalidate = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ enrollmentId, lessonId, answers }: { enrollmentId: number; lessonId: number; answers: Record<string, string[]> }) =>
      apiClient.post<QuizResult>(LEARNING_LESSON_QUIZ(enrollmentId, lessonId), { answers }).then((r) => r.data),
    onSuccess: (res) => {
      if (res?.passed) void invalidate();
    },
  });
}

export function useSubmitTest() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ enrollmentId, answers }: { enrollmentId: number; answers: Record<string, string[]> }) =>
      apiClient.post<QuizResult>(LEARNING_TEST(enrollmentId), { answers }).then((r) => r.data),
    onSuccess,
  });
}

/* ── manager: courses ────────────────────────────────────────────────── */

export function useCreateCourse() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: (body: CourseBody) => apiClient.post<LearningCourse>(LEARNING_COURSES, body).then((r) => r.data),
    onSuccess,
  });
}

export function useUpdateCourse() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, body }: { id: number; body: CourseBody }) =>
      apiClient.patch<LearningCourse>(LEARNING_COURSE(id), body).then((r) => r.data),
    onSuccess,
  });
}

export function useDeleteCourse() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: (id: number) => apiClient.delete(LEARNING_COURSE(id)).then((r) => r.data),
    onSuccess,
  });
}

export function useUploadCover() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: async ({ id, file }: { id: number; file: UploadFile }) => {
      const fd = new FormData();
      await appendFile(fd, 'file', file);
      return apiClient.post<LearningCourse>(LEARNING_COURSE_COVER(id), fd, MULTIPART).then((r) => r.data);
    },
    onSuccess,
  });
}

export function useRemoveCover() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: (id: number) => apiClient.delete(LEARNING_COURSE_COVER(id)).then((r) => r.data),
    onSuccess,
  });
}

export function useAssign() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, employee_ids, deadline }: { id: number; employee_ids: number[]; deadline?: string | null }) =>
      apiClient.post(LEARNING_COURSE_ASSIGN(id), { employee_ids, deadline: deadline || null }).then((r) => r.data),
    onSuccess,
  });
}

export function useWithdrawEnrollment() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: (id: number) => apiClient.delete(LEARNING_ENROLLMENT(id)).then((r) => r.data),
    onSuccess,
  });
}

/* ── manager: sections & order ───────────────────────────────────────── */

export function useCreateSection() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ courseId, title }: { courseId: number; title: string }) =>
      apiClient.post(LEARNING_COURSE_SECTIONS(courseId), { title }).then((r) => r.data),
    onSuccess,
  });
}

export function useRenameSection() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      apiClient.patch(LEARNING_SECTION(id), { title }).then((r) => r.data),
    onSuccess,
  });
}

export function useDeleteSection() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, withLessons }: { id: number; withLessons?: boolean }) =>
      apiClient
        .delete(LEARNING_SECTION(id), { params: withLessons ? { delete_lessons: true } : undefined })
        .then((r) => r.data),
    onSuccess,
  });
}

export function useReorderCurriculum() {
  const qc = useQueryClient();
  return useMutation({
    meta,
    mutationFn: ({ courseId, body }: { courseId: number; body: CurriculumBody }) =>
      apiClient.put<CourseDetail>(LEARNING_COURSE_CURRICULUM(courseId), body).then((r) => r.data),
    onSuccess: (data, v) => {
      // The PUT answers with the new curriculum — paint it at once so the rows do not jump back.
      qc.setQueryData<CourseDetail>(learningKeys.course(v.courseId), (prev) =>
        prev && data ? { ...prev, sections: data.sections ?? prev.sections, lessons: data.lessons ?? prev.lessons } : prev,
      );
      void qc.invalidateQueries({ queryKey: learningKeys.all });
    },
  });
}

/* ── manager: lessons ────────────────────────────────────────────────── */

export function useCreateLesson() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: async ({ courseId, form }: { courseId: number; form: LessonForm }) =>
      apiClient
        .post<LearningLesson>(LEARNING_COURSE_LESSONS(courseId), await lessonFormData(form), MULTIPART)
        .then((r) => r.data),
    onSuccess,
  });
}

export function useUpdateLesson() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: async ({ id, form }: { id: number; form: LessonForm }) =>
      apiClient.patch<LearningLesson>(LEARNING_LESSON(id), await lessonFormData(form), MULTIPART).then((r) => r.data),
    onSuccess,
  });
}

export function useDeleteLesson() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: (id: number) => apiClient.delete(LEARNING_LESSON(id)).then((r) => r.data),
    onSuccess,
  });
}

/* ── manager: questions (final test and quiz lessons) ────────────────── */

export function useCreateQuestion() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ courseId, body }: { courseId: number; body: QuestionBody }) =>
      apiClient.post(LEARNING_COURSE_QUESTIONS(courseId), body).then((r) => r.data),
    onSuccess,
  });
}

export function useUpdateQuestion() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: ({ id, body }: { id: number; body: Partial<QuestionBody> }) =>
      apiClient.patch(LEARNING_QUESTION(id), body).then((r) => r.data),
    onSuccess,
  });
}

export function useDeleteQuestion() {
  const onSuccess = useInvalidate();
  return useMutation({
    meta,
    mutationFn: (id: number) => apiClient.delete(LEARNING_QUESTION(id)).then((r) => r.data),
    onSuccess,
  });
}
