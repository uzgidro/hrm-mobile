// Forma tanlov maydoni: yorliq + tanlangan qiymat (yoki placeholder) + strelka.
// Bosilganda chaqiruvchi o'z tanlagichini (PickerModal / DatePicker / Sheet) ochadi.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from './Text';

export function SelectField({
  label,
  value,
  placeholder,
  onPress,
  icon = 'chevronRight',
  error,
  disabled = false,
  testID,
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
  onPress: () => void;
  icon?: IconName;
  error?: string | null;
  disabled?: boolean;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: ${value}` : label}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.box,
          { backgroundColor: c.surface2, borderColor: error ? c.dangerMark : c.surface2 },
          pressed && { borderColor: c.brand },
          disabled && { opacity: 0.6 },
        ]}
      >
        <Text variant="body" tone={value ? 'fg' : 'subtle'} numberOfLines={1} style={styles.value}>
          {value || placeholder || ''}
        </Text>
        <Icon name={icon} size={18} color={c.fgSubtle} />
      </Pressable>
      {!!error && (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  box: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: { flex: 1 },
});
