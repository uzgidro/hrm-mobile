import type { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

/**
 * Sessiya tugaganda (chiqish) yoki boshqa foydalanuvchi kirganda React Query
 * keshini va rasm keshini tozalaydi.
 *
 * NEGA KERAK (xavfsizlik auditi 2026-10-09): `staleTime` 60 s, `gcTime` 10 daq.
 * Bitta telefonda A chiqib, B bir daqiqa ichida kirsa, B ning ekranlari A ning
 * profili, tabeli, maoshini SO'ROVSIZ keshdan ko'rsatardi — so'rov kalitlarida
 * foydalanuvchi id'si yo'q. Xodim rasmlari ham diskda (`memory-disk`) qolardi.
 *
 * Obuna zustand'da sinxron: `logout` foydalanuvchini `null` qilgan zahoti kesh
 * bo'shaydi, ya'ni keyingi kirishdagi birinchi render allaqachon toza.
 * Qaytadigan funksiya obunani uzadi.
 */
export function wireSessionCleanup(queryClient: QueryClient): () => void {
  return useAuthStore.subscribe((state, prev) => {
    const prevId = prev.user?.id;
    if (prevId == null || state.user?.id === prevId) return;
    queryClient.cancelQueries();
    queryClient.clear();
    void clearImageCaches();
  });
}

async function clearImageCaches(): Promise<void> {
  try {
    const { Image } = await import('expo-image');
    await Promise.all([Image.clearMemoryCache(), Image.clearDiskCache()]);
  } catch {
    // Native modul yo'q (veb / test) — kesh tozalanmasa ham chiqish to'xtamasin.
  }
}
