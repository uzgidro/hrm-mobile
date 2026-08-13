// Shared search input for list screens: magnifier, controlled TextInput and a
// clear button that appears only when there's text. Eight screens hand-rolled
// this with near-identical styles (height drifted between 44 and 46px; 44 is
// the majority — 5 of 8 — so this is the one version, at 44).
//
// Presentational only — each screen keeps its own filter predicate, since the
// searched fields differ per domain.
import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { Icon } from './Icon';

export function SearchBox({
  value,
  onChangeText,
  placeholder,
  testID,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.searchBox} testID={testID}>
      <Icon name="search" size={18} color={colors.textMuted} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 12,
      height: 44,
    },
    searchInput: { flex: 1, color: c.text, fontSize: 14 },
  });
