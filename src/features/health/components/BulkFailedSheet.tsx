// Ommaviy baho natijasi: server yoza olmagan xodimlar va sababi (v2 har biri uchun
// alohida toast chiqarardi — telefonda ro'yxat o'qilishi osonroq).
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Sheet, Text } from '@/ui';

export function BulkFailedSheet({
  items,
  onClose,
}: {
  items: { id: number; name: string; error: string }[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet visible onClose={onClose} title={t('health.bulkFailedTitle')}>
      <View style={styles.body}>
        <Text variant="body" tone="muted">
          {t('health.bulkFailedHint', { count: items.length })}
        </Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
          {items.map((f) => (
            <View key={f.id} testID={`health-failed-${f.id}`} style={styles.item}>
              <Text variant="heading">{f.name}</Text>
              {/* Sabab to'liq ko'rinsin — kesilmaydi. */}
              <Text variant="caption" tone="danger">
                {f.error}
              </Text>
            </View>
          ))}
        </ScrollView>
        <Button label={t('common.close')} variant="soft" full onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 8, flexShrink: 1 },
  scroll: { flexShrink: 1 },
  list: { gap: 10 },
  item: { gap: 2 },
});
