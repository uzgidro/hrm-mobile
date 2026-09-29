// v3 kartasi (v2 Panel): oq yuza, radius lg, yumshoq soya. Sarlavhada modul
// rangidagi ikonka kvadrati; o'ngda ixtiyoriy amal (havola rangida — tomchi ko'k).
// Statik — lab yo'q (lab faqat bosiladiganlarda).
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { moduleTint, radii, shadow, type ModuleTintKey } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from './Text';

export function Card({
  title,
  icon,
  tint = 'violet',
  action,
  children,
  padded = true,
  style,
  testID,
}: {
  title?: string;
  icon?: IconName;
  tint?: ModuleTintKey;
  action?: { label: string; onPress: () => void };
  children?: React.ReactNode;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  const t = moduleTint(c, tint);
  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, shadow('sm', c), padded && styles.padded, style]}
    >
      {(title || action) && (
        <View style={styles.header}>
          {icon && (
            <View style={[styles.iconBox, { backgroundColor: t.wash }]}>
              <Icon name={icon} size={16} color={t.fg} />
            </View>
          )}
          {title && (
            <Text variant="heading" style={styles.title} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
          )}
          {action && (
            <Pressable onPress={action.onPress} accessibilityRole="link" hitSlop={10}>
              <Text variant="label" tone="link" style={styles.action}>
                {action.label}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth },
  padded: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconBox: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1 },
  action: { fontWeight: '600' },
});
