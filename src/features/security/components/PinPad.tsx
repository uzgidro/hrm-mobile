// Shared PIN keypad — the single reusable keypad used by the Setup, Unlock and
// ChangePin screens. Presentational and fully controlled: the parent owns the
// PIN string and auto-submits when it reaches maxLength. PinPad never touches a
// store and never submits — it only reports the new value on each key press.
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { LIP } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { PIN_LENGTH } from '@/auth/lockPolicy';

interface PinPadProps {
  value: string; // current entered digits
  onChange: (next: string) => void; // called with the new value on digit/backspace
  maxLength?: number; // default PIN_LENGTH
  title: string; // e.g. "PIN kodni kiriting"
  subtitle?: string; // optional helper line
  error?: string | null; // shown in red under the dots; also reddens the dots
  onBiometric?: () => void; // if provided, show a fingerprint key bottom-left
  disabled?: boolean; // ignore input while an async unlock is in flight
}

// 1-9 grid, then the bottom row: biometric-or-empty / 0 / backspace.
const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export function PinPad({
  value,
  onChange,
  maxLength = PIN_LENGTH,
  title,
  subtitle,
  error,
  onBiometric,
  disabled = false,
}: PinPadProps) {
  // Subscribe to language changes so the parent-supplied title/subtitle/error
  // (all localized upstream) repaint on a language switch even though this
  // presentational pad holds no strings of its own.
  useTranslation();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const hasError = !!error;

  const pressDigit = (digit: string) => {
    if (disabled) return;
    if (value.length >= maxLength) return;
    onChange(value + digit);
  };

  const pressBackspace = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  const dotColor = (filled: boolean) => {
    if (hasError) return colors.dangerMark;
    return filled ? colors.brand : colors.borderStrong;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.dots}>
        {Array.from({ length: maxLength }).map((_, i) => {
          const filled = i < value.length;
          return (
            <View
              key={i}
              testID={`pin-dot-${i}`}
              accessibilityState={{ selected: filled }}
              style={[
                styles.dot,
                { backgroundColor: filled ? dotColor(true) : 'transparent', borderColor: dotColor(false) },
              ]}
            />
          );
        })}
      </View>

      {hasError ? (
        <Text testID="pin-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <View style={styles.keypad}>
        {DIGIT_ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.keyRow}>
            {row.map((digit) => (
              <PadKey key={digit} id={digit} label={digit} disabled={disabled} onPress={() => pressDigit(digit)} styles={styles}>
                <Text style={styles.keyText}>{digit}</Text>
              </PadKey>
            ))}
          </View>
        ))}

        <View style={styles.keyRow}>
          {onBiometric ? (
            <PadKey id="biometric" label="biometric" disabled={disabled} onPress={onBiometric} styles={styles}>
              <Icon name="fingerprint" size={28} color={colors.brandStrong} />
            </PadKey>
          ) : (
            <View style={styles.keySpacer} />
          )}

          <PadKey id="0" label="0" disabled={disabled} onPress={() => pressDigit('0')} styles={styles}>
            <Text style={styles.keyText}>0</Text>
          </PadKey>

          <PadKey id="backspace" label="backspace" disabled={disabled} onPress={pressBackspace} styles={styles} plain>
            <Icon name="backspace" size={26} color={colors.fg} />
          </PadKey>
        </View>
      </View>
    </View>
  );
}

// «Tomchi × v2» klavishi: oq yuza + 1.5px chegara + pastki lab; bosilganda tushadi.
function PadKey({
  id,
  label,
  disabled,
  onPress,
  children,
  styles,
  plain = false,
}: {
  id: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
  plain?: boolean;
}) {
  return (
    <Pressable
      testID={`pin-key-${id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
    >
      {({ pressed }) => (
        <View
          testID={`pin-face-${id}`}
          style={[
            styles.key,
            plain ? styles.keyPlain : pressed ? styles.keyPressed : null,
          ]}
        >
          {children}
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { alignItems: 'center' },
    title: { fontSize: 22, ...ff('900'), color: c.fg, textAlign: 'center' },
    subtitle: {
      fontSize: 14,
      color: c.fgMuted,
      textAlign: 'center',
      marginTop: 8, ...ff('700') },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 18,
      marginTop: 28,
      marginBottom: 8,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1.5,
    },
    error: {
      fontSize: 13,
      color: c.danger,
      textAlign: 'center',
      marginTop: 4, ...ff('700') },
    keypad: { marginTop: 32, gap: 18 },
    keyRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 28,
    },
    key: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderBottomWidth: 1.5 + LIP,
      borderColor: c.border,
    },
    keyPressed: { borderBottomWidth: 1.5, marginTop: LIP },
    keyPlain: { backgroundColor: 'transparent', borderWidth: 0, borderBottomWidth: 0 },
    keySpacer: { width: 72, height: 72 },
    keyText: { fontSize: 28, ...ff('800'), color: c.fg, fontVariant: ['tabular-nums'] },
  });
