// Ekran qobig'i: v2 kanvas foni, safe-area, 16dp gutter, ixtiyoriy scroll va
// pull-to-refresh. Keng ekranda kontent `maxWidth` bilan markazlanadi.
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

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
  groundTop,
  testID,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  edges?: Edge[];
  maxWidth?: number;
  /** The canvas fades from this colour to its own. */
  groundTop?: string | null;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  // Kenglik KONTEYNERGA nisbatan (100% + maxWidth): planshetda NavRail yonida
  // oyna kengligidan hisoblash kontentni rail ostiga surib kesardi.
  const inner = [styles.inner, padded && styles.padded, { width: '100%' as const, maxWidth }];
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: c.bg }]} testID={testID}>
      {groundTop ? (
        <LinearGradient
          testID="screen-ground"
          colors={[groundTop, c.bg]}
          locations={[0, 0.6]}
          style={[StyleSheet.absoluteFill, styles.ground]}
        />
      ) : null}
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
  ground: { pointerEvents: 'none' },
  scroll: { alignItems: 'center', paddingBottom: 24 },
  inner: { alignSelf: 'center' },
  padded: { paddingHorizontal: SCREEN_GUTTER },
  fill: { flex: 1 },
});
