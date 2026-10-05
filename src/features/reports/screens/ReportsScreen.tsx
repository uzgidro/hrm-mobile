// v3 Hisobotlar — web v2 `ReportsPage` porti. Tablar v2 dagi kabi huquqqa bog'liq:
//   • Hisobotlar katalogi — hisobot dvigateli; server faqat ishga tushira oladiganlaringizni
//     beradi (bo'sh bo'lsa tab yo'q), standart tab shu;
//   • Murojaatlar statistikasi — faqat so'rovlarni ko'rib chiquvchi (canManageStructure);
//   • Kadrlar tarkibi — har doim.
// To'rtinchi v2 tab — Hisobot konstruktori (`/statistics/*`) — web'da (izoh bilan).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { canManageStructure, isDeputy, isMinister } from '@/utils/roles';
import { PageHeader, Screen, Segmented, Text } from '@/ui';
import { reportCatalogQuery, reportsKeys } from '../api/queries';
import { ReportCatalogList } from '../components/ReportCatalogList';
import { RequestsStats } from '../components/RequestsStats';
import { StaffStats } from '../components/StaffStats';

type Tab = 'catalog' | 'requests' | 'staff';

export default function ReportsScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canRequests = canManageStructure(user);
  // v2 konstruktor darvozasi (backend statistics._require_manager): kadr/admin + rahbariyat.
  const canConstructor = canRequests || isMinister(user) || isDeputy(user);
  const qc = useQueryClient();
  const catalog = useQuery(reportCatalogQuery());
  const items = catalog.data?.items ?? [];
  const hasCatalog = catalog.isPending || items.length > 0;
  const [requested, setRequested] = useState<Tab | null>(null);

  // v2: ruxsati yo'q tabga o'tib bo'lmaydi; standart — katalog, bo'lmasa murojaatlar, bo'lmasa kadrlar.
  const allowed = (v: Tab | null): v is Tab =>
    v === 'staff' || (v === 'catalog' && hasCatalog) || (v === 'requests' && canRequests);
  const tab: Tab = allowed(requested) ? requested : hasCatalog ? 'catalog' : canRequests ? 'requests' : 'staff';
  const tabs = [
    ...(hasCatalog ? [{ value: 'catalog' as const, label: t('reports.tabCatalog') }] : []),
    ...(canRequests ? [{ value: 'requests' as const, label: t('reports.tabRequests') }] : []),
    { value: 'staff' as const, label: t('reports.tabStaff') },
  ];

  return (
    // Katalog, murojaatlar va kadrlar yig'malari — hammasi `reportsKeys.all` ostida.
    <Screen
      refreshing={catalog.isRefetching}
      onRefresh={() => void qc.invalidateQueries({ queryKey: reportsKeys.all })}
    >
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} />
      {tabs.length > 1 && (
        <View style={styles.tabs}>
          <Segmented<Tab> testID="reports-tabs" value={tab} onChange={setRequested} options={tabs} />
        </View>
      )}
      {tab === 'catalog' ? (
        <ReportCatalogList
          items={items}
          loading={catalog.isPending}
          onOpen={(code) => router.push(`/hisobot?code=${encodeURIComponent(code)}` as Href)}
        />
      ) : tab === 'requests' ? (
        <RequestsStats />
      ) : (
        <StaffStats />
      )}
      {canConstructor && (
        <Text variant="caption" tone="subtle" style={styles.note}>
          {t('reports.catalogWebOnly')}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { marginBottom: 12 },
  note: { marginTop: 8 },
});
