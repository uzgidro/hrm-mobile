// Ko'rik ortidagi skan va tahlillar (v2 `CheckupFiles`). Ochish — server havolasi faqat
// http(s) bo'lsa tizim brauzerida. Biriktirish / olib tashlash — muallif doktor: server
// `can_edit` / `can_delete` VA tafsilotning `can_add_checkup` (doktorlik) bayrog'i birga.
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { isHttpUrl } from '@/utils/safeUrl';
import { Button, IconButton } from '@/ui';
import { useAddCheckupFile, useRemoveCheckupFile } from '../api/mutations';
import { fileRights, shortFileName, type Checkup, type CheckupFile } from '../utils/medical';

export function CheckupFiles({ checkup, isDoctor }: { checkup: Checkup; isDoctor: boolean }) {
  const { t } = useTranslation();
  const add = useAddCheckupFile();
  const remove = useRemoveCheckupFile();
  const files = checkup.files ?? [];
  const { canAttach, canDetach } = fileRights(isDoctor, checkup);
  if (files.length === 0 && !canAttach) return null;

  const open = (f: CheckupFile) => {
    if (isHttpUrl(f.file_url)) void Linking.openURL(f.file_url.trim());
    else toast.error(t('medical.fileUnsafe'));
  };

  const attach = async () => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    try {
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
          <Button
            testID={`medical-file-${f.id}`}
            label={shortFileName(f.original_filename || `#${f.id}`)}
            icon="doc"
            variant="ghost"
            size="sm"
            onPress={() => open(f)}
            style={styles.name}
          />
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
  file: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  name: { flexShrink: 1 },
});
