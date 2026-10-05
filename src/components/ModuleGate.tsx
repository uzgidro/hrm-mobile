// Root Stack sahifa darvozasi — `app/_layout.tsx` dagi `screenLayout` har ekranni shu
// bilan o'raydi. Modul katalogida kirish huquqi yo'q foydalanuvchi (masalan oddiy
// xodim) to'g'ridan-to'g'ri havola bilan `/foydalanuvchilar` ni ochsa, admin sahifasi
// ramkasi va so'rovlari o'rniga «Ruxsat yo'q» ko'rsatiladi. Ma'lumotni server baribir
// 403 bilan to'xtatadi — bu UI darajasidagi himoya (Playwright QA C, 2026-10-05).
//
// Master admin'ning `nav.modules` sozlamasi modulni qo'shimcha rollarga ochishi mumkin:
// standart huquq rad etsa-yu sozlama hali yuklanmagan bo'lsa — bo'sh fon (bir lahzalik
// «Ruxsat yo'q» miltillamasin), yuklangach qaror qilinadi.
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { navSettingsQuery, readNavOverrides } from '@/lib/navSettings';
import { canAccessPage } from '@/utils/roles';
import { gatedPageForRoute } from '@/utils/moduleCatalog';
import { Card, EmptyState, PageHeader, Screen } from '@/ui';

export function ModuleGate({ routeName, children }: { routeName: string; children: ReactNode }) {
  const page = gatedPageForRoute(routeName);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!page || !isAuthenticated) return <>{children}</>;
  return <PageCheck page={page}>{children}</PageCheck>;
}

function PageCheck({ page, children }: { page: NonNullable<ReturnType<typeof gatedPageForRoute>>; children: ReactNode }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const settings = useQuery(navSettingsQuery());
  const allowed = canAccessPage(user, page, readNavOverrides(settings.data));
  if (allowed) return <>{children}</>;
  if (settings.isPending) return <Screen testID="module-gate-pending">{null}</Screen>;
  return (
    <Screen testID="module-gate-denied">
      <PageHeader title={t(`modules.labels.${page}`)} />
      <Card>
        <EmptyState title={t('common.pageNoAccess')} message={t('common.pageNoAccessHint')} pose="sad" />
      </Card>
    </Screen>
  );
}
