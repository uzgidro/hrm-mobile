// Horizontal filter-chip strip. A bare horizontal `ScrollView` placed in a
// column flex parent keeps ScrollView's default `flexGrow: 1`, so with two
// strips above an empty list each one swallowed a third of the screen (the
// chips floated apart with huge gaps — user screenshot 2026-09-14). Pinning
// the outer style to its content height keeps the strip one row tall.
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export function ChipScroll({ children, contentContainerStyle, testID }: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      testID={testID}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { flexGrow: 0, flexShrink: 0 },
});
