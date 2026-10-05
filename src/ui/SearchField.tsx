// Qidiruv maydoni: surface2 fon, pill, 44dp, chapda lupa, o'ngda tozalash.
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { ff } from '@/theme/typography';
import { radii } from '@/theme/tokens';
import { NO_WEB_OUTLINE } from '@/theme/web';
import { Icon } from '@/components/Icon';

export function SearchField({
  value,
  onChangeText,
  placeholder,
  autoFocus,
  testID,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  // Brauzer o'z fokus to'rtburchagini ichki inputga chizmaydi (NO_WEB_OUTLINE) — fokus
  // o'rniga butun pill chegarasi drop rangida ko'rinadi (klaviatura fokusi yo'qolmaydi).
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={[styles.box, { backgroundColor: c.surface2, borderColor: focused ? c.drop : 'transparent' }]}>
      <Icon name="search" size={18} color={c.fgSubtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.fgSubtle}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        maxFontSizeMultiplier={1.3}
        testID={testID}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, { color: c.fg }, ff('400', 'text'), NO_WEB_OUTLINE]}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel={t('common.clear')} hitSlop={10}>
          <Icon name="close" size={16} color={c.fgSubtle} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: 12.5,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
});
