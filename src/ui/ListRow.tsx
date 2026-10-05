// Ro'yxat qatori. `pressable` — Duolingo naqshi: alohida karta, 1.5px border +
// pastki lab (navigatsiya qatorlari). Aks holda karta ichidagi oddiy qator.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { LIP, radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Text } from './Text';

export function ListRow({
  title,
  subtitle,
  left,
  right,
  onPress,
  pressable = false,
  badge,
  chevron,
  below,
  titleAddon,
  testID,
}: {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  pressable?: boolean;
  badge?: number;
  chevron?: boolean;
  /** Sarlavha ostidagi qo'shimcha qator (masalan, telefonda status nishonlari — `right` ism joyini yemasin). */
  below?: React.ReactNode;
  /** Sarlavha yonidagi kichik belgi (masalan, majburiy «*») — sarlavha qisqarganda ham ko'rinib turadi. */
  titleAddon?: React.ReactNode;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  const content = (pressed: boolean) => (
    <View
      style={[
        styles.row,
        pressable && {
          backgroundColor: c.surface,
          borderColor: c.border,
          borderWidth: 1.5,
          borderBottomWidth: pressed ? 1.5 : LIP + 1.5,
          marginTop: pressed ? LIP : 0,
          borderRadius: radii.lg,
          paddingHorizontal: 14,
        },
        !pressable && pressed && { backgroundColor: c.surface2 },
      ]}
    >
      {left}
      <View style={styles.text}>
        {titleAddon ? (
          <View style={styles.titleLine}>
            <Text variant="heading" numberOfLines={1} style={[styles.title, styles.titleShrink]}>
              {title}
            </Text>
            {titleAddon}
          </View>
        ) : (
          <Text variant="heading" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        )}
        {subtitle ? (
          <Text variant="caption" tone="subtle" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {below}
      </View>
      {right}
      {!!badge && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: c.dangerMark }]}>
          <Text variant="caption" tone="onBrand" style={styles.badgeText}>
            {badge > 99 ? '99+' : String(badge)}
          </Text>
        </View>
      )}
      {(chevron ?? (pressable && !!onPress)) && <Icon name="chevronRight" size={18} color={c.fgSubtle} />}
    </View>
  );

  if (!onPress) return <View testID={testID}>{content(false)}</View>;
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" accessibilityLabel={title}>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 15 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  titleShrink: { flexShrink: 1, minWidth: 0 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontWeight: '800', fontSize: 11, lineHeight: 14 },
});
