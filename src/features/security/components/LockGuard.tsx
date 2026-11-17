// Container for the app content that sits beneath the PIN gate. While `locked`
// it is removed from the screen-reader tree (TalkBack / VoiceOver) and stops
// receiving touches, so nothing behind the overlay can be read or activated.
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export function LockGuard({ locked, style, children }: { locked: boolean; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <View
      testID="app-content"
      style={style}
      importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={locked}
      pointerEvents={locked ? 'none' : 'auto'}
    >
      {children}
    </View>
  );
}
