// Two-pane master-detail row for tablet-landscape. The caller decides WHEN to
// use it (breakpoint gate) and owns selection state; this component only lays
// out the panes and shows a placeholder in the detail pane when nothing is
// selected.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function SplitLayout({
  master,
  detail,
  placeholder,
  masterWidth = 0.36,
}: {
  master: React.ReactNode;
  detail: React.ReactNode;
  placeholder?: React.ReactNode;
  masterWidth?: number;
}) {
  const { colors } = useTheme();
  const frac = Math.min(0.44, Math.max(0.28, masterWidth));
  return (
    <View style={styles.row}>
      <View style={[styles.master, { flex: frac }]}>{master}</View>
      <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
      <View style={[styles.detail, { flex: 1 - frac }]}>
        {detail ?? placeholder ?? null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  master: { minWidth: 0 },
  divider: { width: StyleSheet.hairlineWidth },
  detail: { minWidth: 0 },
});
