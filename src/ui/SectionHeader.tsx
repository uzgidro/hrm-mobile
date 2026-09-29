// Bo'lim sarlavhasi + ixtiyoriy «Barchasi» havolasi (tomchi ko'k — havola roli).
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text variant="heading" style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} accessibilityRole="link" hitSlop={10}>
          <Text variant="label" tone="link" style={styles.action}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 10 },
  title: { flex: 1 },
  action: { fontWeight: '600' },
});
