// The app-wide screen shell. Roots every screen: a flex-1 SafeAreaView plus a
// centered content column capped at the breakpoint's contentMaxWidth. On phones
// the column equals full width (no visible change); on tablets it centers so the
// content isn't stretched edge-to-edge. Always includes left/right safe-area
// edges so landscape content clears the notch — the one place that's handled.
import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { useBreakpoint } from '../utils/responsive';

export type ScreenEdge = 'top' | 'bottom' | 'left' | 'right';

export function Screen({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  maxWidth,
  center = true,
  style,
  testID,
  overlay,
}: {
  children: React.ReactNode;
  edges?: ScreenEdge[];
  /** number = fixed cap; 'full' = no centering; undefined = breakpoint cap. */
  maxWidth?: number | 'full';
  center?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /**
   * Slot for absolute-positioned overlays (FABs, action bars). Rendered as a
   * sibling of the centered content column, inside the SafeAreaView — so its
   * `position: absolute` children anchor to the full screen edge, not to the
   * tablet-capped column. Pass `undefined` to render nothing.
   */
  overlay?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const bp = useBreakpoint();

  // Always clear the notch horizontally: whatever the caller asked for, add
  // left/right. (Every legacy screen passed only top/bottom.)
  const safeEdges = Array.from(new Set([...edges, 'left', 'right'])) as ScreenEdge[];

  const cap = maxWidth === 'full' ? bp.width : (maxWidth ?? bp.contentMaxWidth);
  const constrained = center && maxWidth !== 'full' && cap < bp.width;

  return (
    <SafeAreaView
      testID={testID}
      edges={safeEdges}
      style={[styles.safe, { backgroundColor: colors.bg }, style]}
    >
      <View
        testID={testID ? `${testID}-content` : undefined}
        style={
          constrained
            ? [styles.column, { maxWidth: cap }]
            : styles.full
        }
      >
        {children}
      </View>
      {overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  full: { flex: 1 },
  // A centered, capped column. alignSelf:center within the flex-1 safe area.
  column: { flex: 1, width: '100%', alignSelf: 'center' },
});
