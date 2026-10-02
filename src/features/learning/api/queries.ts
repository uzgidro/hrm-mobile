import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { LEARNING_COURSES, LEARNING_ENROLLMENT, LEARNING_META, LEARNING_MY } from '@/api/urls';

export interface LearningCourse {
  id: number;
  title: string;
  description?: string | null;
  provider?: string | null;
  hours?: number | null;
  is_open_enrollment?: boolean;
  is_published?: boolean;
  lesson_count?: number;
  enrolled?: number;
}

export interface LearningEnrollment {
  id: number;
  course_id: number;
  course_title?: string | null;
  hours?: number | null;
  status: string;
  status_label?: string | null;
  progress?: number | null;
  score?: number | null;
  deadline?: string | null;
  certificate_number?: string | null;
}

export interface LearningLesson {
  id: number;
  title?: string | null;
  lesson_type?: string | null;
  content?: string | null;
  video_url?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  duration_minutes?: number | null;
}

export interface EnrollmentDetail extends LearningEnrollment {
  lessons?: LearningLesson[];
  completed_lesson_ids?: number[];
  has_test?: boolean;
}

export const learningKeys = {
  all: ['learning'] as const,
  meta: () => [...learningKeys.all, 'meta'] as const,
  my: () => [...learningKeys.all, 'my'] as const,
  courses: (p: object) => [...learningKeys.all, 'courses', p] as const,
  enrollment: (id: number) => [...learningKeys.all, 'enrollment', id] as const,
};

/** Menejer bayrog'i SERVERdan (filialdagi `lms_manager` roli /auth/me da yo'q) — mijoz o'zi chiqarmaydi. */
export function learningMetaQuery() {
  return queryOptions({
    queryKey: learningKeys.meta(),
    queryFn: () =>
      apiClient.get<{ is_manager?: boolean }>(LEARNING_META).then((r) => ({ isManager: !!r.data?.is_manager })),
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

export function enrollmentQuery(id: number) {
  return queryOptions({
    queryKey: learningKeys.enrollment(id),
    queryFn: () => apiClient.get<EnrollmentDetail>(LEARNING_ENROLLMENT(id)).then((r) => r.data),
  });
}
