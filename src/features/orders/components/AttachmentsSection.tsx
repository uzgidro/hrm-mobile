// Buyruqqa biriktirilgan ILOVA fayllar.
//
// ⚠️ Mobilда bu bo'lim umuman yo'q edi: yaratishda yuklangan fayllarni keyin
// ko'rib ham, o'chirib ham bo'lmasdi (backendда `DELETE /order-acts/{id}/
// documents/{docId}` bor). Asosiy buyruq hujjati (`decree_*`) ro'yxatdan
// CHIQARILADI — u alohida OnlyOffice ekranida ochiladi va o'chirilmaydi.
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { OrderAct } from '@/types';
import { Icon } from '@/components/Icon';
import { Section } from './DetailParts';
import { useDeleteOrderDocument } from '../api/mutations';

const isMainDecree = (objectName?: string | null) =>
  !!objectName && objectName.startsWith('decree_');

export function AttachmentsSection({
  order, canManage, onChanged,
}: {
  order: OrderAct;
  /** O'chirish huquqi — tahrir huquqi bilan bir xil (muallif / kadr). */
  canManage: boolean;
  onChanged: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const del = useDeleteOrderDocument(order.id);

  const files = (order.documents ?? []).filter((d) => !isMainDecree(d.document_objectname));
  if (!files.length) return null;

  const nameOf = (objectName?: string | null) => {
    if (!objectName) return t('orders.attachmentFallback');
    // Obyekt nomi `<uuid>.<ext>` ko'rinishida — foydalanuvchiga kengaytma
    // bilan qisqa nom ko'rsatamiz.
    const base = objectName.split('/').pop() ?? objectName;
    return base.length > 34 ? `…${base.slice(-30)}` : base;
  };

  const confirmDelete = (docId: number) => {
    Alert.alert(t('orders.attachmentDeleteTitle'), t('orders.attachmentDeleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync(docId);
            onChanged();
          } catch {
            /* xato toast'i QueryClient onError orqali */
          }
        },
      },
    ]);
  };

  return (
    <Section title={t('orders.sectionAttachments')}>
      {files.map((f) => (
        <View key={f.id} style={styles.row}>
          <Icon name="doc" size={16} color={colors.textMuted} />
          <TouchableOpacity
            style={styles.nameBtn}
            disabled={!f.file_path}
            onPress={() => f.file_path && Linking.openURL(f.file_path)}
            activeOpacity={0.7}
          >
            <Text style={[styles.name, !f.file_path && styles.nameDisabled]} numberOfLines={1}>
              {nameOf(f.document_objectname)}
            </Text>
          </TouchableOpacity>
          {canManage && (
            del.isPending ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <TouchableOpacity onPress={() => confirmDelete(f.id)} hitSlop={10} testID={`attach-del-${f.id}`}>
                <Icon name="trash" size={16} color={colors.error} />
              </TouchableOpacity>
            )
          )}
        </View>
      ))}
    </Section>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    nameBtn: { flex: 1 },
    name: { fontSize: 14, color: c.primaryLight },
    nameDisabled: { color: c.textMuted },
  });
