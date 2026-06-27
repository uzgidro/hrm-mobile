// Shared header for stack (non-tab) screens. Gives every page the same
// clean back button + title, with an optional right-side action slot.
//
//   <ScreenHeader title="So'rovlar" right={<HeaderAction icon="plus" onPress={...} />} />

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { Icon, IconName } from './Icon';

export function ScreenHeader({
  title,
  count,
  right,
  onBack,
}: {
  title: string;
  count?: number;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack ?? (() => router.back())}
        style={styles.backBtn}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <Icon name="chevronLeft" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {count != null && count > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{count > 99 ? '99+' : count}</Text>
          </View>
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
}: {
  icon: IconName;
  onPress: () => void;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={8}
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primarySoft,
      }}
    >
      <Icon name={icon} size={20} color={color ?? colors.primary} />
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 2 },
    title: { fontSize: 19, fontWeight: '800', color: c.text, flexShrink: 1 },
    countBadge: {
      backgroundColor: c.warning, borderRadius: 10, paddingHorizontal: 7,
      paddingVertical: 1, minWidth: 20, alignItems: 'center',
    },
    countBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
    rightSlot: { minWidth: 38, alignItems: 'flex-end', justifyContent: 'center' },
  });
