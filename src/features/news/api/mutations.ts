import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { NEWS_POSTS, NEWS_POST_DETAIL } from '@/api/urls';
import type { NewsPost } from '@/types';
import { newsKeys } from './queries';

interface NewsPostForm {
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

// Edit / delete (web NewsPage.jsx:71,216 parity). Same manager gate as create
// (`can_manage_news` on the server; `isNewsManager` on the client).
export function updateNewsPost(id: number, form: NewsPostForm): Promise<NewsPost> {
  return apiClient
    .patch<NewsPost>(NEWS_POST_DETAIL(id), {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      organization_branch_id: form.organization_branch_id ?? null,
    })
    .then((r) => r.data);
}

export function deleteNewsPost(id: number): Promise<void> {
  return apiClient.delete(NEWS_POST_DETAIL(id)).then(() => undefined);
}

export function useUpdateNewsPost(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: NewsPostForm) => updateNewsPost(id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: newsKeys.all }),
  });
}

export function useDeleteNewsPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteNewsPost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: newsKeys.all }),
  });
}
