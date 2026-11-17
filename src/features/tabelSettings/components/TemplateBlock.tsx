// «Tabel blanki» block of a branch: the stored form's name, what the system recognised in it, the own-legend
// note, plus upload / download / constructor. Every new action hides itself on an old server (no constructor
// catalogue) — then only the read-only part that older servers already had remains.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { downloadAndSave } from '@/lib/saveFile';
import { toast } from '@/lib/toast';
import { ORGANIZATION_BRANCH_TABEL_TEMPLATE } from '@/api/urls';
import { Badge, Button, Text } from '@/ui';
import { useUploadTabelTemplate } from '../api/mutations';
import { tabelTemplateColumnsQuery } from '../api/queries';
import type { TabelBranch } from '../utils/tabelConfig';
import { readTabelTemplateMeta } from '../utils/tabelTemplate';
import { TemplateReport } from './TemplateReport';
import { TemplateSheet } from './TemplateSheet';

const XLSX_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
];

export function TemplateBlock({ branch, canEdit }: { branch: TabelBranch; canEdit: boolean }) {
  const { t } = useTranslation();
  const meta = readTabelTemplateMeta(branch);
  // The catalogue doubles as the capability probe: it only loads on a server that has the constructor.
  const columns = useQuery(tabelTemplateColumnsQuery(canEdit));
  const catalog = columns.data;
  const upload = useUploadTabelTemplate();
  const [builder, setBuilder] = useState(0);
  const [busy, setBusy] = useState(false);

  const pickAndUpload = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: XLSX_TYPES, multiple: false, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    try {
      await upload.mutateAsync({
        id: branch.id,
        file: { uri: a.uri, name: a.name, mimeType: a.mimeType ?? undefined, file: a.file ?? null },
      });
      toast.success(t('tabelSettings.tplUploaded'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('tabelSettings.tplUploadFail')));
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      await downloadAndSave({ url: ORGANIZATION_BRANCH_TABEL_TEMPLATE(branch.id) }, 'tabel-shablon.xlsx');
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('tabelSettings.tplDownloadFail')));
    } finally {
      setBusy(false);
    }
  };

  // Without the constructor catalogue (old server) there is nothing new to show.
  if (!catalog) return null;

  return (
    <View style={styles.block} testID="tabel-template-block">
      {meta && (
        <View style={styles.badges}>
          {meta.options && <Badge label={t('tabelSettings.tplBuiltByConstructor')} tone="brand" testID="tabel-built-by-constructor" />}
          {meta.sheets.length > 0 && <Badge label={t('tabelSettings.tplSheets', { sheets: meta.sheets.join(', ') })} />}
        </View>
      )}
      {meta?.autodetect && <TemplateReport autodetect={meta.autodetect} catalog={catalog} />}
      {meta?.ownLegend && (
        <Text variant="caption" tone="subtle" testID="tabel-own-legend">
          {t('tabelSettings.tplcLegendNote')}
        </Text>
      )}
      {canEdit && (
        <View style={styles.actions}>
          <Button
            testID="tabel-open-builder"
            label={meta?.options ? t('tabelSettings.tplcEdit') : t('tabelSettings.tplcBuild')}
            icon="edit"
            variant="soft"
            onPress={() => setBuilder((n) => n + 1)}
            full
          />
          <Button
            testID="tabel-upload-template"
            label={meta ? t('tabelSettings.tplReplace') : t('tabelSettings.tplUpload')}
            icon="arrowUp"
            variant="soft"
            loading={upload.isPending}
            onPress={() => void pickAndUpload()}
            full
          />
          {meta && (
            <Button
              testID="tabel-download-template"
              label={t('tabelSettings.tplDownload')}
              icon="arrowDown"
              variant="soft"
              loading={busy}
              onPress={() => void download()}
              full
            />
          )}
        </View>
      )}
      {builder > 0 && (
        <TemplateSheet
          key={builder}
          branch={branch}
          catalog={catalog}
          initial={meta?.options ?? null}
          detectedCodes={meta?.autodetect?.codes}
          hasTemplate={!!meta}
          onClose={() => setBuilder(0)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { gap: 8 },
});
