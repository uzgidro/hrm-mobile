// v3 Foydalanuvchilar — web v2 `UsersPage` porti (TZ 4.2.1). To'rt tab: xodim hisoblari
// (faollashtirish/faolsizlantirish), administratorlar (CRUD + parol xati), rol vakillari (ko'rish)
// va kiosk hisoblari (CRUD + parol xati). Filial tanlagichi v2 global tanlagichi o'rnida — xodim,
// rol vakili va kiosk ro'yxatlarini toraytiradi (bo'sh = barcha filiallar); administratorlar
// ro'yxati unga bog'liq emas (v2). Huquq: katalog ADMIN_ONLY; har tab serverdan 403 olsa —
// «ruxsat yo'q». Ommaviy amallar, surat yuklash, rol vakilini tahrirlash — web'da.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageHeader, Screen, Segmented, SelectField } from '@/ui';
import { usersKeys } from '../api/queries';
import { AccountsTab } from '../components/AccountsTab';
import { AdminsTab } from '../components/AdminsTab';
import { KioskTab } from '../components/KioskTab';
import { MultiOrgTab } from '../components/MultiOrgTab';
import { BranchPicker, useBranchName } from '../components/UsersBits';

type Tab = 'accounts' | 'admins' | 'multiorg' | 'kiosk';

/** Keng ekranda ro'yxat butun enga cho'zilmaydi (boshqa W6 ro'yxat ekranlari kabi, Tizim holati — 960). */
const LIST_MAX_WIDTH = 960;

export default function UsersScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('accounts');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { nameOf } = useBranchName(branchId != null);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await qc.refetchQueries({ queryKey: usersKeys.all, type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={refreshing} onRefresh={() => void refresh()} maxWidth={LIST_MAX_WIDTH}>
        <PageHeader title={t('users.title')} subtitle={t('users.subtitle')} />
        <View style={styles.controls}>
          <Segmented
            testID="users-tabs"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'accounts', label: t('users.tabAccounts') },
              { value: 'admins', label: t('users.tabAdmins') },
              { value: 'multiorg', label: t('users.tabMultiOrg') },
              { value: 'kiosk', label: t('users.tabKiosk') },
            ]}
          />
          {tab !== 'admins' && (
            <SelectField
              testID="users-branch"
              label={t('users.colBranch')}
              value={branchId == null ? '' : nameOf(branchId)}
              placeholder={t('users.allBranches')}
              icon="building"
              onPress={() => setPicking(true)}
            />
          )}
        </View>
        {tab === 'accounts' && <AccountsTab branchId={branchId} />}
        {tab === 'admins' && <AdminsTab />}
        {tab === 'multiorg' && <MultiOrgTab branchId={branchId} />}
        {tab === 'kiosk' && <KioskTab branchId={branchId} />}
      </Screen>
      {picking && (
        <BranchPicker
          visible
          selected={branchId}
          allLabel={t('users.allBranches')}
          onClose={() => setPicking(false)}
          onSelect={setBranchId}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: { gap: 10, marginBottom: 12 },
});
