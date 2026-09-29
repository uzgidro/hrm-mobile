// Keng ekranda (expanded) ro'yxat + tafsilot yonma-yon; aks holda faqat ro'yxat
// (tafsilot odatdagidek push qilinadi).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useBreakpoint } from '@/utils/responsive';

export const MASTER_WIDTH = 380;

export function MasterDetail({
  master,
  detail,
  emptyDetail,
}: {
  master: React.ReactNode;
  detail: React.ReactNode | null;
  emptyDetail: React.ReactNode;
}) {
  const { colors: c } = useTheme();
  const { masterDetail } = useBreakpoint();
  if (!masterDetail) return <>{master}</>;
  return (
    <View style={styles.row}>
      <View style={[styles.master, { borderRightColor: c.border }]}>{master}</View>
      <View style={styles.detail}>{detail ?? emptyDetail}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  master: { width: MASTER_WIDTH, borderRightWidth: StyleSheet.hairlineWidth },
  detail: { flex: 1 },
});
