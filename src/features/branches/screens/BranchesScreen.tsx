// v3 Filiallar — web v2 `BranchesPage` porti: bitta ekran, ikki tab, chunki ular bitta zanjir — manzil
// filialsiz yetib bo'lmas, manzilsiz filialda turniket turmaydi. Filiallar: qidiruv, tafsilot,
// «Hik'ga yuborish» (navbatga), tahrir, qo'shish/o'chirish (faqat master-admin va admin hisobi). Manzillar:
// ro'yxat, qo'shish/tahrir/o'chirish. Huquq — v2 `RequireRole(canAccessSystemAdmin)`: admin hisobi,
// master-admin, AKT xodimi (`canMonitorTerminals` bilan bir xil qoida). Admin hisobining bosh sahifasi
// shu ekran (v2 DashboardPage → /filiallar) — Asosiy tabida ochiladi, orqaga tugmasi bo'lmaydi.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { canMonitorTerminals } from '@/utils/roles';
import { Card, EmptyState, PageHeader, Screen, Segmented } from '@/ui';
import { branchesKeys } from '../api/queries';
import { BranchesTab } from '../components/BranchesTab';
import { LocationsTab } from '../components/LocationsTab';

type Tab = 'branches' | 'locations';

export default function BranchesScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('branches');
  const [refreshing, setRefreshing] = useState(false);
  // «Hik'ga yuborish» navbatga qo'yilgan vaqt (filial id → ms): sinxron ko'rinmas, tugma bir daqiqa
  // bosilmaydi (v2). Ekranda turadi — tablar almashganda BranchesTab qayta yaratilsa ham saqlanadi.
  const [queuedAt, setQueuedAt] = useState<Record<number, number>>({});

  const header = <PageHeader title={t('branches.title')} subtitle={t('branches.subtitle')} />;
  if (!canMonitorTerminals(user)) {
    return (
      <Screen>
        {header}
        <Card>
          <EmptyState title={t('branches.noAccess')} message={t('branches.noAccessHint')} pose="sad" />
        </Card>
      </Screen>
    );
  }

  const refresh = async () => {
    setRefreshing(true);
    try {
      await qc.refetchQueries({ queryKey: branchesKeys.all, type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={refreshing} onRefresh={() => void refresh()} testID="branches-screen">
        {header}
        <View style={styles.controls}>
          <Segmented
            testID="branches-tabs"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'branches', label: t('branches.tabBranches') },
              { value: 'locations', label: t('branches.tabLocations') },
            ]}
          />
        </View>
        {tab === 'branches' ? (
          <BranchesTab queuedAt={queuedAt} onQueued={(id) => setQueuedAt((q) => ({ ...q, [id]: Date.now() }))} />
        ) : (
          <LocationsTab />
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: { gap: 10, marginBottom: 12 },
});
