// A list row with several lines of text (the stock ListRow cuts its subtitle to one line):
// title + status on top, free lines below, an optional pressable body.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Text } from '@/ui';

export function MultiRow({
  title,
  right,
  lines,
  children,
  onPress,
  testID,
}: {
  title: string;
  right?: React.ReactNode;
  /** Muted caption lines under the title; blank ones are dropped. */
  lines?: (string | null | undefined | false)[];
  /** Extra content under the lines (phone links, badges). */
  children?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
}) {
  // Only the text part is pressable: phone links and buttons in `children` must not sit inside another button.
  const head = (
    <>
      <View style={styles.top}>
        <Text variant="heading" style={styles.flex}>{title}</Text>
        {right}
      </View>
      {(lines ?? []).filter(Boolean).map((l, i) => (
        <Text key={i} variant="caption" tone="muted">{l as string}</Text>
      ))}
    </>
  );
  return (
    <Card testID={testID}>
      {onPress ? (
        <Pressable testID={testID ? `${testID}-open` : undefined} accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
          {head}
        </Pressable>
      ) : (
        head
      )}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
