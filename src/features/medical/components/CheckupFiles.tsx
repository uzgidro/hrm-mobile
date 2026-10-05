// Ko'rik ortidagi skan va tahlillar (v2 `CheckupFiles`). Ochish — server havolasi faqat
// http(s) bo'lsa tizim brauzerida. Biriktirish / olib tashlash — muallif doktor: server
// `can_edit` / `can_delete` VA tafsilotning `can_add_checkup` (doktorlik) bayrog'i birga.
import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { isHttpUrl } from '@/utils/safeUrl';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '@/components/Icon';
import { Button, IconButton, Text } from '@/ui';
import { useAddCheckupFile, useRemoveCheckupFile } from '../api/mutations';
import { fileRights, shortFileName, type Checkup, type CheckupFile } from '../utils/medical';

export function CheckupFiles({ checkup, isDoctor }: { checkup: Checkup; isDoctor: boolean }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const add = useAddCheckupFile();
  const remove = useRemoveCheckupFile();
  const files = checkup.files ?? [];
  const { canAttach, canDetach } = fileRights(isDoctor, checkup);
  if (files.length === 0 && !canAttach) return null;

  const open = (f: CheckupFile) => {
    if (isHttpUrl(f.file_url)) Linking.openURL(f.file_url.trim()).catch(() => toast.error(t('medical.fileUnsafe')));
    else toast.error(t('medical.fileUnsafe'));
  };

  const attach = async () => {
    try {
      // Android: picker allaqachon ochiq bo'lsa getDocumentAsync rad etadi — xato yutilmasin.
      const res = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      await add.mutateAsync({ id: checkup.id, file: { uri: a.uri, name: a.name, mimeType: a.mimeType } });
      toast.success(t('medical.fileAdded'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const detach = async (f: CheckupFile) => {
    const ok = await confirm({
      title: t('medical.fileDeleteTitle'),
      message: t('medical.fileDeleteConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(f.id);
      toast.success(t('medical.fileDeleted'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.wrap}>
      {files.map((f) => (
        <View key={f.id} style={styles.file}>
          {/* Fayl — havola (drop-ko'k), tugma emas: nom qatorni egallaydi, o'chirish o'ng chetda. */}
          <Pressable
            testID={`medical-file-${f.id}`}
            accessibilityRole="link"
            accessibilityLabel={f.original_filename || `#${f.id}`}
            onPress={() => open(f)}
            style={({ pressed }) => [styles.name, pressed && styles.pressed]}
          >
            <Icon name="doc" size={16} color={c.drop} />
            <Text variant="label" tone="link" numberOfLines={1} style={styles.flex}>
              {shortFileName(f.original_filename || `#${f.id}`)}
            </Text>
          </Pressable>
          {canDetach && (
            <IconButton
              testID={`medical-file-remove-${f.id}`}
              icon="trash"
              accessibilityLabel={t('common.delete')}
              onPress={() => void detach(f)}
            />
          )}
        </View>
      ))}
      {canAttach && (
        <Button
          testID={`medical-file-add-${checkup.id}`}
          label={t('medical.addFile')}
          icon="plus"
          variant="soft"
          size="sm"
          loading={add.isPending}
          onPress={() => void attach()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, alignItems: 'flex-start' },
  file: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'stretch' },
  name: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
  flex: { flexShrink: 1 },
  pressed: { opacity: 0.6 },
});
