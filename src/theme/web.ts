// Web-only style escapes. React Native's types don't know `outlineStyle: 'none'`,
// but react-native-web passes it through — it removes the browser's own focus
// ring on inputs whose bordered box already shows focus (design I fields).
import { Platform, type TextStyle } from 'react-native';

export const NO_WEB_OUTLINE: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {};
