// Dizayn «I · Tomchi» tugmasi: qalin, katta harfli yozuv va pastki «lab»
// (primary — to'q ko'k soya; outline — 2px chegara + 4px pastki chegara).
// Bosilganda lab yo'qoladi va tugma 4px pastga «tushadi» — Duolingo hissi.
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { ff } from '../theme/typography';
import { Icon, type IconName } from './Icon';

const LIP = 4;

export function ChunkyButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
  testID,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const primary = variant === 'primary';
  const fg = primary ? colors.onPrimary : colors.primaryLight;
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.hit, style]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.face,
            primary ? styles.primary : styles.outline,
            pressed && !inactive && (primary ? styles.primaryPressed : styles.outlinePressed),
            inactive && styles.inactive,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={fg} />
          ) : (
            <>
              {!!icon && <Icon name={icon} size={18} color={fg} />}
              <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
                {label.toLocaleUpperCase()}
              </Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    // The hit area keeps the lip's height so the layout never jumps on press.
    hit: { paddingBottom: 0 },
    face: {
      height: 52,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 18,
    },
    primary: {
      backgroundColor: c.primary,
      borderBottomWidth: LIP,
      borderBottomColor: c.primaryShadow,
    },
    primaryPressed: { borderBottomWidth: 0, marginTop: LIP },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderBottomWidth: LIP,
      borderColor: c.cardBorder,
    },
    outlinePressed: { borderBottomWidth: 2, marginTop: LIP - 2, backgroundColor: c.primarySoft },
    inactive: { opacity: 0.6 },
    label: { fontSize: 15, letterSpacing: 0.8, ...ff('900') },
  });
