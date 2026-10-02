// Sahifalash: ‹ 2 / 7 › — server sahifalangan ro'yxatlar ostida.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <View style={styles.pager}>
      <Button label="‹" variant="soft" size="sm" disabled={page <= 1} onPress={() => onPage(page - 1)} testID="pager-prev" />
      <Text variant="label" tone="muted">{`${page} / ${pages}`}</Text>
      <Button label="›" variant="soft" size="sm" disabled={page >= pages} onPress={() => onPage(page + 1)} testID="pager-next" />
    </View>
  );
}

const styles = StyleSheet.create({
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12 },
});
