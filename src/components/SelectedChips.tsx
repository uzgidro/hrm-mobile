// Ko'p tanlovli tanlagich ostida TANLANGANLARNING NOMLARI.
//
// NEGA KERAK: ilgari tanlagichda faqat SON ko'rsatilardi ("3 ta tanlandi").
// Foydalanuvchi kimni tanlaganini tekshirish uchun oynani QAYTA ochishga
// majbur bo'lardi — kelishuvchilar, rahbariyat va tanishuvchi bo'limlarda
// eng ko'p shikoyat shundan edi ("to'liq chiqmaydi / noto'g'ri chiqadi").
// Endi nomlar chip sifatida ko'rinadi va har birini shu yerdayoq olib
// tashlash mumkin.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from './Icon';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';

export type ChipItem = { value: number; label: string };

export function SelectedChips({
  items,
  onRemove,
  emptyText,
}: {
  items: ChipItem[];
  onRemove?: (value: number) => void;
  emptyText?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  if (!items.length) {
    return emptyText ? <Text style={styles.empty}>{emptyText}</Text> : null;
  }

  return (
    <View style={styles.wrap} testID="selected-chips">
      {items.map((it) => (
        <View key={it.value} style={styles.chip}>
          {/* Ism BUTUN ko'rinadi: uzun bo'lsa keyingi qatorga o'tadi
              (numberOfLines QO'YILMAYDI — aynan shu kesish shikoyat edi). */}
          <Text style={styles.chipText}>{it.label}</Text>
          {onRemove && (
            <TouchableOpacity
              onPress={() => onRemove(it.value)}
              hitSlop={8}
              style={styles.chipClose}
              testID={`chip-remove-${it.value}`}
            >
              <Icon name="close" size={13} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 999,
      paddingVertical: 5,
      paddingHorizontal: 10,
      maxWidth: '100%',
    },
    chipText: { fontSize: 12, color: c.text, flexShrink: 1 },
    chipClose: { marginLeft: 2 },
    empty: { fontSize: 12, color: c.textMuted, marginTop: 6 },
  });

export default SelectedChips;
