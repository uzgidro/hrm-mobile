// Ekran qobig'i: v2 kanvas foni, safe-area, 16dp gutter, ixtiyoriy scroll va
// pull-to-refresh. Keng ekranda kontent `maxWidth` bilan markazlanadi.
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useBreakpoint } from '@/utils/responsive';

export const SCREEN_GUTTER = 16;
export const SCREEN_MAX_WIDTH = 1280;

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  padded = true,
  edges = ['top'],
  maxWidth = SCREEN_MAX_WIDTH,
  testID,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  edges?: Edge[];
  maxWidth?: number;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  const { width } = useBreakpoint();
  const inner = [
    styles.inner,
    padded && styles.padded,
    { width: Math.min(width, maxWidth) },
  ];
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: c.bg }]} testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} colors={[c.brand]} />
            ) : undefined
          }
        >
          <View style={inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[inner, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { alignItems: 'center', paddingBottom: 24 },
  inner: { alignSelf: 'center' },
  padded: { paddingHorizontal: SCREEN_GUTTER },
  fill: { flex: 1 },
});
