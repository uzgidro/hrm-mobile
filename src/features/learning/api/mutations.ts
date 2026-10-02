import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { LEARNING_COURSES, LEARNING_ENROLLMENT } from '@/api/urls';
import { learningKeys } from './queries';

export const enrollInCourse = (courseId: number) =>
  apiClient.post(`${LEARNING_COURSES}/${courseId}/enroll`, {}).then((r) => r.data);
export const completeLesson = (enrollmentId: number, lessonId: number) =>
  apiClient.post(`${LEARNING_ENROLLMENT(enrollmentId)}/lessons/${lessonId}/complete`, {}).then((r) => r.data);

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: learningKeys.all });
}

const meta = { skipErrorToast: true };

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
