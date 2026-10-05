// v3 Ma'lumotnomalar — web v2 `DictionariesPage` porti (TZ 4.2.5, D1/D2): «ma'lumotnomalar ma'lumotnomasi».
// Avval ro'yxat (D2 — mavjud ma'lumotnomalar), tanlangani — o'sha ekranda yozuvlari. O'qish barcha
// rollarga ochiq (server hammaga bir xil katalog beradi); yozish — `canManageDictionaries` (master-admin,
// kadr), tashqi manbali va tizim ma'lumotnomalari hech kimga yozilmaydi. Yozuvlar o'zgarsa `['dictionaries']`
// ildizi yangilanadi — boshqa ekranlardagi tanlagichlar (ta'til sabablari, qo'shimcha maydon formasi) ham.
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { canManageDictionaries } from '@/utils/roles';
import { PageHeader, Screen } from '@/ui';
import { dictionariesKeys, dictionaryTypesQuery } from '../api/queries';
import { EntriesView } from '../components/EntriesView';
import { TypeList } from '../components/TypeList';

export default function DictionariesScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const manage = canManageDictionaries(useAuthStore((s) => s.user));
  const types = useQuery(dictionaryTypesQuery());
  const [code, setCode] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const selected = code ? (types.data ?? []).find((x) => x.code === code) : undefined;

  // Android «orqaga» — avval ma'lumotnoma ro'yxatiga, keyin ekrandan.
  useEffect(() => {
    if (!code) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setCode(null);
      return true;
    });
    return () => sub.remove();
  }, [code]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await qc.refetchQueries({ queryKey: dictionariesKeys.all, type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={refreshing} onRefresh={() => void refresh()} testID="dictionaries-screen">
        <PageHeader
          title={t('dictionaries.title')}
          subtitle={types.data ? t('dictionaries.subtitle', { count: types.data.length }) : undefined}
        />
        {selected ? (
          <EntriesView key={selected.code} type={selected} manage={manage} onBack={() => setCode(null)} />
        ) : (
          <TypeList list={types} manage={manage} onPick={setCode} />
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
