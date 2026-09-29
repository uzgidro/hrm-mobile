// 44×44 ikonka tugmasi (header: qidiruv, qo'ng'iroq, mavzu). Badge 9+ ga qisqaradi.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from './Text';

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  badge,
  tone = 'plain',
  testID,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  badge?: number;
  tone?: 'plain' | 'soft';
  testID?: string;
}) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.btn,
        tone === 'soft' && { backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth },
        pressed && { backgroundColor: c.surface2 },
      ]}
    >
      <Icon name={icon} size={22} color={c.fgMuted} />
      {!!badge && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: c.dangerMark, borderColor: c.surface }]}>
          <Text variant="caption" style={styles.badgeText} tone="onBrand">
            {badge > 9 ? '9+' : String(badge)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 44, height: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '800' },
});
