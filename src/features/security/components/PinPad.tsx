// Shared PIN keypad — the single reusable keypad used by the Setup, Unlock and
// ChangePin screens. Presentational and fully controlled: the parent owns the
// PIN string and auto-submits when it reaches maxLength. PinPad never touches a
// store and never submits — it only reports the new value on each key press.
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
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
    if (hasError) return colors.error;
    return filled ? colors.primary : colors.cardBorder;
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
              <TouchableOpacity
                key={digit}
                testID={`pin-key-${digit}`}
                style={styles.key}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={disabled}
                onPress={() => pressDigit(digit)}
              >
                <Text style={styles.keyText}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.keyRow}>
          {onBiometric ? (
            <TouchableOpacity
              testID="pin-key-biometric"
              style={styles.key}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={disabled}
              onPress={onBiometric}
            >
              <Icon name="fingerprint" size={28} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.key} />
          )}

          <TouchableOpacity
            testID="pin-key-0"
            style={styles.key}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={disabled}
            onPress={() => pressDigit('0')}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="pin-key-backspace"
            style={styles.key}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={disabled}
            onPress={pressBackspace}
          >
            <Icon name="backspace" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '700', color: c.text, textAlign: 'center' },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
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
      color: c.error,
      textAlign: 'center',
      marginTop: 4,
    },
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
    },
    keyText: { fontSize: 28, fontWeight: '500', color: c.text },
  });
