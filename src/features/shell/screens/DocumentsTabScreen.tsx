// v3 Hujjatlar tabi: Buyruqlar · Xatlar · Hujjatlar segmentlari (Kann pill trek).
// Segment ekranlarining o'zi boshqa feature'larda — cross-feature import taqiqi
// sababli ularni route fayli (`app/(tabs)/documents.tsx`) `renderSegment` orqali beradi.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { useNavSettings } from '@/lib/navSettings';
import { menuBadgesQuery } from '@/lib/menuBadges';
import { Segmented, Text } from '@/ui';
import { docSegments, pickSegment, type DocSegment } from '../utils/docSegments';

export default function DocumentsTabScreen({ renderSegment }: { renderSegment: (seg: DocSegment) => React.ReactNode }) {
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navOverrides = useNavSettings();
  const { seg: requested } = useLocalSearchParams<{ seg?: string }>();
  const { data: badges } = useQuery(menuBadgesQuery());

  const available = useMemo(
    () => docSegments(user),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, navOverrides],
  );
  const [chosen, setChosen] = useState<DocSegment | null>(null);
  // URL'dan kelgan (push / deep link) segment tanlovdan ustun, keyin foydalanuvchi tanlovi.
  const [lastRequested, setLastRequested] = useState(requested);
  if (requested !== lastRequested) {
    setLastRequested(requested);
    setChosen(null);
  }
  const seg = pickSegment(chosen ?? requested, available);

  const labels: Record<DocSegment, string> = {
    orders: t('modules.labels.orders'),
    letters: t('modules.labels.letters'),
    documents: t('modules.labels.documents'),
  };
  const counts: Record<DocSegment, number> = {
    orders: badges?.orders ?? 0,
    letters: badges?.letters ?? 0,
    documents: badges?.documents ?? 0,
  };

  const onChange = (next: DocSegment) => {
    setChosen(next);
    router.setParams({ seg: next });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {t('tabs.documents')}
        </Text>
        {available.length > 1 && (
          <View style={styles.segments}>
            <Segmented
              options={available.map((s) => ({ value: s, label: labels[s], count: counts[s] }))}
              value={seg}
              onChange={onChange}
            />
          </View>
        )}
      </View>
      <View style={styles.body}>{available.length > 0 ? renderSegment(seg) : null}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 12 },
  segments: {},
  body: { flex: 1 },
});
