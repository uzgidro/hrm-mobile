// Shared header for stack (non-tab) screens. Gives every page the same
// clean back button + title, with an optional right-side action slot.
//
//   <ScreenHeader title="So'rovlar" right={<HeaderAction icon="plus" onPress={...} />} />
//
// v3 «Tomchi × v2»: 44dp dumaloq orqaga tugmasi (a11y yorlig'i bilan), sarlavha
// Nunito (display), izoh Inter; sanoq — yumshoq pill (e'tibor — warning).

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { ff } from '../theme/typography';
import { radii } from '../theme/tokens';
import { Text } from '../ui/Text';
import { Icon, IconName } from './Icon';

export function ScreenHeader({
  title,
  subtitle,
  count,
  countTone = 'neutral',
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  /** 'neutral' (default) is a plain grey "how many" indicator; 'attention' is
   *  today's orange "needs attention" badge (e.g. pending approvals). */
  countTone?: 'neutral' | 'attention';
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        hitSlop={6}
        style={({ pressed }) => [styles.backBtn, pressed && { backgroundColor: colors.surface2 }]}
      >
        <Icon name="chevronLeft" size={24} color={colors.fg} />
      </Pressable>
      <View style={styles.titleCol}>
        <View style={styles.titleRow}>
          <Text variant="title" style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {count != null && count > 0 && (
            <View style={[styles.countBadge, countTone === 'attention' && styles.countBadgeAttention]}>
              <Text variant="caption" style={[styles.countBadgeText, countTone === 'attention' && styles.countBadgeTextAttention]}>
                {count > 99 ? '99+' : String(count)}
              </Text>
            </View>
          )}
        </View>
        {subtitle != null && (
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.rightSlot}>{right ?? null}</View>
    </View>
  );
}

export function HeaderAction({
  icon,
  onPress,
  color,
  disabled = false,
  accessibilityLabel,
}: {
  icon: IconName;
  onPress: () => void;
  color?: string;
  /** While a mutation is pending — blocks the double tap (delete twice, etc). */
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        width: 44,
        height: 44,
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.brandSoft,
      })}
    >
      <Icon name={icon} size={20} color={color ?? colors.brandStrong} />
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 4,
    },
    backBtn: { width: 44, height: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
    titleCol: { flex: 1, justifyContent: 'center', paddingLeft: 2 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 20, lineHeight: 26, flexShrink: 1 },
    subtitle: { marginTop: 1 },
    countBadge: {
      backgroundColor: c.surface2,
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 1,
      minWidth: 22,
      alignItems: 'center',
    },
    countBadgeAttention: { backgroundColor: c.warningSoft },
    countBadgeText: { color: c.fgMuted, ...ff('700', 'text') },
    countBadgeTextAttention: { color: c.warning },
    rightSlot: { minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  });
