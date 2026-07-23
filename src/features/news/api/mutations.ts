import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { NEWS_POSTS } from '@/api/urls';
import type { NewsPost } from '@/types';
import { newsKeys } from './queries';

export interface NewsPostForm {
  title: string;
  description?: string;
  organization_branch_id?: number | null;
}

// Create a news post. Plain JSON (no image) — matches the backend NewsPostCreate
// schema. An empty description or branch normalizes to null (branch null = all).
export function createNewsPost(form: NewsPostForm): Promise<NewsPost> {
  return apiClient
    .post<NewsPost>(NEWS_POSTS, {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      organization_branch_id: form.organization_branch_id ?? null,
    })
    .then((r) => r.data);
}

export function useCreateNewsPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: NewsPostForm) => createNewsPost(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: newsKeys.all }),
  });
}
