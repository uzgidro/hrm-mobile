// Ichki ekran sarlavhasi (v3): orqaga tugmasi (faqat orqaga yo'l bo'lsa) +
// sarlavha + ixtiyoriy izoh va o'ng amal. W3 ekranlaridagi qo'lda yozilgan
// sarlavha qatorining umumiy shakli.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useIsTabRoot } from '@/components/TabRoot';
import { IconButton } from './IconButton';
import { Text } from './Text';

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { t } = useTranslation();
  // Mehmonning bosh ekrani kabi redirect bilan ochilgan sahifada orqaga yo'l yo'q;
  // tab ildizida (`<TabRoot>`) ham — u yerda navigatsiya tab bar / NavRail'da.
  const tabRoot = useIsTabRoot();
  const canBack = !tabRoot && (router.canGoBack?.() ?? true);
  return (
    <View style={styles.row}>
      {canBack && <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />}
      <View style={styles.flex}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {!!subtitle && (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 12 },
  flex: { flex: 1 },
});
