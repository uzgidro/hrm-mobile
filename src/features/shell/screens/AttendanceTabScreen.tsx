// v3 Davomat tabi: «Mening tabelim · Jamoa» segmentlari (2026-10-06, foydalanuvchi: eski mobilda
// filial xodimlarining kelgan-kelmaganini ko'rsa bo'lardi, yangisida yo'q edi). Segment
// ekranlari boshqa feature'larda — route fayli (`app/(tabs)/attendance.tsx`) `renderSegment` bilan beradi.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Segmented, Text } from '@/ui';

export type AttendanceSegment = 'mine' | 'team';

export default function AttendanceTabScreen({
  renderSegment,
}: {
  renderSegment: (seg: AttendanceSegment) => React.ReactNode;
}) {
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { seg: requested } = useLocalSearchParams<{ seg?: string }>();
  const [chosen, setChosen] = useState<AttendanceSegment | null>(null);
  const seg: AttendanceSegment = chosen ?? (requested === 'team' ? 'team' : 'mine');

  const onChange = (next: AttendanceSegment) => {
    setChosen(next);
    router.setParams({ seg: next });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {t('tabs.attendance')}
        </Text>
        <Segmented
          testID="attendance-segments"
          options={[
            { value: 'mine', label: t('attendance.tabMine') },
            { value: 'team', label: t('attendance.tabTeam') },
          ]}
          value={seg}
          onChange={onChange}
        />
      </View>
      <View style={styles.body}>{renderSegment(seg)}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 12 },
  body: { flex: 1 },
});
