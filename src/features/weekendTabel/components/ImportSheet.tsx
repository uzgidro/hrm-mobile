// Excel import (web v2 `ImportModal`): pick the branch's filled form, see a dry-run preview, then confirm.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import type { UploadFile } from '@/api/formFile';
import { toast } from '@/lib/toast';
import { Button, Card, Sheet, Text } from '@/ui';
import { useImportExcel } from '../api/mutations';
import type { ImportPreview } from '../types';

const XLSX_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
];

export function ImportSheet({
  year,
  month,
  organizationBranchId,
  onClose,
}: {
  year: number;
  month: number;
  organizationBranchId?: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const imp = useImportExcel();
  const [file, setFile] = useState<UploadFile | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (f: UploadFile, dryRun: boolean) => imp.mutateAsync({ file: f, year, month, organizationBranchId, dryRun });

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: XLSX_TYPES, multiple: false, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const f: UploadFile = { uri: a.uri, name: a.name, mimeType: a.mimeType ?? undefined, file: a.file ?? null };
    setFile(f);
    setPreview(null);
    setError(null);
    try {
      setPreview(await run(f, true));
    } catch (e) {
      setError(getApiErrorMessage(e, t('weekendTabel.importFail')));
    }
  };

  const confirmImport = async () => {
    if (!file) return;
    try {
      const r = await run(file, false);
      toast.success(t('weekendTabel.importDone', { count: r.entries }));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('weekendTabel.importFail')));
    }
  };

  const checking = imp.isPending && !preview;
  return (
    <Sheet visible onClose={onClose} title={t('weekendTabel.importTitle')} scroll>
      <View style={styles.body} testID="weekend-import-sheet">
        <Text variant="caption" tone="muted">
          {t('weekendTabel.importIntro')}
        </Text>
        <Button
          testID="weekend-import-pick"
          label={file ? t('weekendTabel.importChange') : t('weekendTabel.importPick')}
          icon="arrowUp"
          variant="soft"
          disabled={imp.isPending}
          onPress={() => void pick()}
          full
        />
        {file && (
          <Text variant="caption" tone="subtle" numberOfLines={1} grow>
            {file.name}
          </Text>
        )}
        {checking && <Text variant="caption">{t('weekendTabel.importChecking')}</Text>}
        {!!error && (
          <Text variant="caption" tone="danger" testID="weekend-import-error">
            {error}
          </Text>
        )}
        {preview && (
          <Card testID="weekend-import-preview">
            {!!preview.sheet && <Row label={t('weekendTabel.importSheet')} value={preview.sheet} />}
            <Row label={t('weekendTabel.importEmployees')} value={String(preview.employees)} />
            <Row label={t('weekendTabel.importEntries')} value={String(preview.entries)} />
            {preview.weekday_entries > 0 && (
              <Text variant="caption" tone="danger">
                {t('weekendTabel.importWeekdayWarn', { count: preview.weekday_entries })}
              </Text>
            )}
            {preview.unmatched.length > 0 && (
              <View style={styles.list}>
                <Text variant="label">
                  {t('weekendTabel.importUnmatched')} ({preview.unmatched.length})
                </Text>
                {preview.unmatched.map((u) => (
                  <Text key={`${u.row}-${u.name}`} variant="caption" tone="muted">
                    {u.name} ({t('weekendTabel.importRow', { row: u.row })})
                  </Text>
                ))}
              </View>
            )}
            {preview.ambiguous.length > 0 && (
              <View style={styles.list}>
                <Text variant="label">
                  {t('weekendTabel.importAmbiguous')} ({preview.ambiguous.length})
                </Text>
                {preview.ambiguous.map((u) => (
                  <Text key={`${u.row}-${u.name}`} variant="caption" tone="muted">
                    {u.name} ({t('weekendTabel.importRow', { row: u.row })})
                  </Text>
                ))}
              </View>
            )}
            {preview.entries === 0 && (
              <Text variant="caption" tone="muted">
                {t('weekendTabel.importNothing')}
              </Text>
            )}
          </Card>
        )}
        {preview && preview.entries > 0 && (
          <Button
            testID="weekend-import-confirm"
            label={t('weekendTabel.importConfirm')}
            icon="check"
            loading={imp.isPending}
            onPress={() => void confirmImport()}
            full
          />
        )}
      </View>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" tone="muted" style={styles.flex}>
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  flex: { flex: 1 },
  list: { gap: 2, marginTop: 8 },
});
