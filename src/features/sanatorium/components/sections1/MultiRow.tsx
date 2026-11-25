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
  const body = (
    <Card testID={testID ? `${testID}-card` : undefined}>
      <View style={styles.top}>
        <Text variant="heading" style={styles.flex}>{title}</Text>
        {right}
      </View>
      {(lines ?? []).filter(Boolean).map((l, i) => (
        <Text key={i} variant="caption" tone="muted">{l as string}</Text>
      ))}
      {children}
    </Card>
  );
  if (!onPress) return <View testID={testID}>{body}</View>;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
