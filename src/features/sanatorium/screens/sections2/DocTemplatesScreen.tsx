// Document templates (contract, invoice, act, epikriz, organization invoice): placeholder list,
// download of the current template, DOCX upload and reset to the built-in default.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SANATORIUM_DOC_TEMPLATE_DOWNLOAD } from '@/api/urls';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { Badge, Button, Card, EmptyState, Text } from '@/ui';
import { templatesQuery, useResetTemplate, useUploadTemplate, type DocTemplate } from '../../api/sections2';
import { QueryBlock } from '../../components/common';
import { DownloadButton, SectionScreen } from '../../components/sections2/kit';
import { fmtDateTime, sanErrorMessage } from '../../utils/sanatorium';

const DOCX_TYPES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'];

export default function DocTemplatesScreen() {
  const { t } = useTranslation();
  const q = useQuery(templatesQuery());
  return (
    <SectionScreen title={t('sanatorium.s2.docTemplates')} feature="documents" roles={['registrar']} testID="san-templates-screen" refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <Text variant="caption" tone="muted">{t('sanatorium.s2.templatesHint')}</Text>
      <QueryBlock query={q}>
        {(list) => (list.length === 0 ? <EmptyState title={t('sanatorium.s2.noTemplates')} /> : <View style={styles.stack}>{list.map((x) => <TemplateCard key={x.kind} tpl={x} />)}</View>)}
      </QueryBlock>
    </SectionScreen>
  );
}

function TemplateCard({ tpl }: { tpl: DocTemplate }) {
  const { t } = useTranslation();
  const upload = useUploadTemplate();
  const reset = useResetTemplate();
  const [open, setOpen] = useState(false);
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: DOCX_TYPES, multiple: false, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    if (!/\.docx$/i.test(a.name)) return toast.error(t('sanatorium.s2.docxOnly'));
    try {
      await upload.mutateAsync({ kind: tpl.kind, file: { uri: a.uri, name: a.name, mimeType: a.mimeType ?? DOCX_TYPES[0]! } });
      toast.success(t('sanatorium.s2.templateUploaded'));
    } catch (e) {
      toast.error(sanErrorMessage(e, t('errors.generic')));
    }
  };
  const doReset = async () => {
    if (!(await confirm({ title: t('sanatorium.s2.resetTemplate'), message: t('sanatorium.s2.resetTemplateInfo'), confirmLabel: t('sanatorium.s2.resetTemplate'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    try {
      await reset.mutateAsync(tpl.kind);
      toast.success(t('sanatorium.s2.templateReset'));
    } catch (e) {
      toast.error(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <Card testID={`template-${tpl.kind}`}>
      <View style={styles.head}>
        <Text variant="heading" style={styles.flex}>{t(`sanatorium.s2.docKind.${tpl.kind}`)}</Text>
        <Badge label={tpl.is_default ? t('sanatorium.s2.defaultTemplate') : t('sanatorium.s2.customTemplate')} tone={tpl.is_default ? 'neutral' : 'brand'} />
      </View>
      {!tpl.is_default && <Text variant="caption" tone="muted">{[tpl.filename, tpl.updated_at ? fmtDateTime(tpl.updated_at) : null].filter(Boolean).join(' · ')}</Text>}
      <View style={styles.actions}>
        <DownloadButton testID={`tpl-dl-${tpl.kind}`} label={t('sanatorium.s2.downloadTemplate')} format="docx" url={SANATORIUM_DOC_TEMPLATE_DOWNLOAD(tpl.kind)} filename={`${tpl.kind}-template.docx`} />
        <Button testID={`tpl-up-${tpl.kind}`} label={t('sanatorium.s2.uploadTemplate')} size="sm" variant="soft" loading={upload.isPending} onPress={() => void pick()} />
        {!tpl.is_default && <Button testID={`tpl-reset-${tpl.kind}`} label={t('sanatorium.s2.resetTemplate')} size="sm" variant="dangerGhost" loading={reset.isPending} onPress={() => void doReset()} />}
        <Button label={open ? t('sanatorium.s2.hidePlaceholders') : t('sanatorium.s2.showPlaceholders')} size="sm" variant="ghost" onPress={() => setOpen((v) => !v)} />
      </View>
      {open && (
        <View style={styles.ph} testID={`tpl-ph-${tpl.kind}`}>
          {tpl.placeholders.map((p) => (
            <Text key={p.key} variant="caption"><Text variant="caption" weight="700">{`{{ ${p.key} }}`}</Text> {p.description}</Text>
          ))}
          {Object.entries(tpl.rows ?? {}).map(([name, cols]) => (
            <Text key={name} variant="caption" tone="muted">{`{%tr for x in ${name} %}`}: {cols.join(', ')}</Text>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' },
  ph: { marginTop: 8, gap: 4 },
});
