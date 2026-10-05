// Web-only matn uslublari. RN tiplari `wordBreak`/`overflowWrap` ni bilmaydi,
// react-native-web esa ularni o'tkazadi: bo'linmas uzun so'z (e-pochta, URL, kalit)
// konteynerdan chiqib ketmay, satr chegarasida bo'linadi. Native'da — bo'sh.
import { Platform, type TextStyle } from 'react-native';

export const WEB_BREAK: TextStyle =
  Platform.OS === 'web' ? ({ wordBreak: 'break-word', overflowWrap: 'anywhere' } as unknown as TextStyle) : {};
