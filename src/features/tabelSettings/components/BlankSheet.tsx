// Hujjat blanki varag'i (v2 `BranchBlankModal`): hujjat turi (bildirgi · ariza · buyruq), tayyor .docx holati
// (olib tashlash mumkin), logo (chiqsinmi, eni, joylashuvi; filial logosini olib tashlash), sarlavha qatorlari
// (≤ 8), hujjat nomi, quyi kolontitul, standart bloklar, chekkalar. Faqat tanlangan tur saqlanadi — server
// qolganlarini tegmasdan qoldiradi. Fayl/logo yuklash va ko'rinish — web'da. Tur almashsa forma saqlangan
// qiymatdan qayta boshlanadi (v2). Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { Badge, Button, IconButton, Segmented, Sheet, Text } from '@/ui';
import { useRemoveBlankFile, useRemoveLogo, useSaveBlank } from '../api/mutations';
import {
  blockOn,
  blocksFor,
  buildBlankBody,
  DEFAULT_BLANK_TITLE,
  MARGIN_SIDES,
  MAX_HEADER_LINES,
  seedBlank,
  toggleBlock,
  uploadedFile,
  validateBlank,
  type BlankDocType,
  type BlockKey,
  type BranchBlank,
} from '../utils/blank';
import type { TabelBranch } from '../utils/tabelConfig';
import { DecimalField, SectionTitle, SwitchRow } from './TabelBits';

const BLOCK_LABEL: Record<BlockKey, string> = {
  number_date: 'tabelSettings.blkNumberDate',
  addressee: 'tabelSettings.blkAddressee',
  sign_position: 'tabelSettings.blkSignPosition',
  sign_qr: 'tabelSettings.blkSignQr',
  city: 'tabelSettings.blkCity',
  signature_section: 'tabelSettings.blkSignSection',
};

export function BlankSheet({ branch, onClose }: { branch: TabelBranch; onClose: () => void }) {
  const { t } = useTranslation();
  const [doc, setDoc] = useState<BlankDocType>('explanatory');
  return (
    <Sheet visible onClose={onClose} title={t('tabelSettings.blankTitle')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="caption" tone="subtle">
          {branch.name || `#${branch.id}`}
        </Text>
        <Segmented
          testID="blank-doc"
          value={doc}
          onChange={setDoc}
          options={[
            { value: 'explanatory', label: t('tabelSettings.docBildirgi') },
            { value: 'application', label: t('tabelSettings.docAriza') },
            { value: 'decree', label: t('tabelSettings.docDecree') },
          ]}
        />
        <BlankForm key={doc} branch={branch} doc={doc} onSaved={onClose} />
      </ScrollView>
    </Sheet>
  );
}

function BlankForm({ branch, doc, onSaved }: { branch: TabelBranch; doc: BlankDocType; onSaved: () => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<BranchBlank>(() => seedBlank(branch.document_templates, doc));
  const [error, setError] = useState<string | null>(null);
  const save = useSaveBlank();
  const removeFile = useRemoveBlankFile();
  const removeLogo = useRemoveLogo();
  // Fayl holati ro'yxatdan jonli (olib tashlansa darhol yangilanadi), forma esa o'z draft'ida.
  const uploaded = uploadedFile(seedBlank(branch.document_templates, doc));
  const lines = draft.header_lines ?? [];

  const set = (p: Partial<BranchBlank>) => {
    setDraft((d) => ({ ...d, ...p }));
    setError(null);
  };

  const submit = async () => {
    const invalid = validateBlank(draft);
    if (invalid) return setError(t(invalid));
    try {
      await save.mutateAsync({ id: branch.id, body: buildBlankBody(doc, draft) });
      toast.success(t('tabelSettings.blankSaved'));
      onSaved();
    } catch (e) {
      setError(getApiErrorMessage(e, t('tabelSettings.actionFailed')));
    }
  };

  const ask = (title: string, message: string) =>
    confirm({ title, message, confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });

  const dropFile = async () => {
    if (!(await ask(t('tabelSettings.removeFile'), t('tabelSettings.removeFileConfirm')))) return;
    try {
      await removeFile.mutateAsync({ id: branch.id, doc });
      toast.success(t('tabelSettings.fileRemoved'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('tabelSettings.actionFailed')));
    }
  };

  const dropLogo = async () => {
    if (!(await ask(t('tabelSettings.removeLogo'), t('tabelSettings.removeLogoConfirm')))) return;
    try {
      await removeLogo.mutateAsync(branch.id);
      toast.success(t('tabelSettings.logoRemoved'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('tabelSettings.actionFailed')));
    }
  };

  const hint = (text: string) => (
    <Text variant="caption" tone="subtle">
      {text}
    </Text>
  );

  return (
    <View style={styles.body}>
      <SectionTitle>{t('tabelSettings.readyFile')}</SectionTitle>
      <View style={styles.row}>
        {uploaded ? (
          <Badge label={uploaded.original || t('tabelSettings.fileLoaded')} tone="success" testID="blank-file" />
        ) : (
          <Text variant="caption" tone="subtle" testID="blank-file">
            {t('tabelSettings.noFile')}
          </Text>
        )}
      </View>
      {hint(uploaded ? t('tabelSettings.fileWinsHint') : t('tabelSettings.uploadHint'))}
      {uploaded && (
        <Button
          testID="blank-file-remove"
          label={t('tabelSettings.removeFile')}
          icon="trash"
          variant="dangerGhost"
          onPress={() => void dropFile()}
          loading={removeFile.isPending}
          full
        />
      )}

      <SectionTitle>{t('tabelSettings.logoSection')}</SectionTitle>
      <SwitchRow
        testID="blank-logo"
        label={t('tabelSettings.showLogo')}
        hint={branch.logo_path ? undefined : t('tabelSettings.noLogoHint')}
        value={!!draft.logo}
        onChange={(v) => set({ logo: v })}
      />
      {!!branch.logo_path && (
        <Button
          testID="blank-logo-remove"
          label={t('tabelSettings.removeLogo')}
          icon="trash"
          variant="dangerGhost"
          size="sm"
          onPress={() => void dropLogo()}
          loading={removeLogo.isPending}
        />
      )}
      <DecimalField
        testID="blank-logo-width"
        label={t('tabelSettings.logoWidth')}
        value={draft.logo_width_cm}
        placeholder="2.5"
        onChange={(v) => set({ logo_width_cm: v })}
      />
      {hint(t('tabelSettings.logoWidthHint'))}
      <Text variant="label" tone="muted">
        {t('tabelSettings.logoAlign')}
      </Text>
      <Segmented
        testID="blank-logo-align"
        value={draft.logo_align ?? 'center'}
        onChange={(v) => set({ logo_align: v })}
        options={[
          { value: 'left', label: t('tabelSettings.alignLeft') },
          { value: 'center', label: t('tabelSettings.alignCenter') },
          { value: 'right', label: t('tabelSettings.alignRight') },
        ]}
      />

      <SectionTitle>{t('tabelSettings.headerLines')}</SectionTitle>
      {hint(t('tabelSettings.headerLinesHint'))}
      {lines.map((l, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.flex}>
            <FormInput
              testID={`blank-line-${i}`}
              label={`${i + 1}`}
              value={l}
              onChangeText={(v) => set({ header_lines: lines.map((x, idx) => (idx === i ? v : x)) })}
            />
          </View>
          <IconButton
            testID={`blank-line-remove-${i}`}
            icon="trash"
            accessibilityLabel={t('common.delete')}
            onPress={() => set({ header_lines: lines.filter((_, idx) => idx !== i) })}
          />
        </View>
      ))}
      {lines.length < MAX_HEADER_LINES && (
        <Button
          testID="blank-line-add"
          label={t('tabelSettings.addLine')}
          icon="plus"
          variant="link"
          size="sm"
          onPress={() => set({ header_lines: [...lines, ''] })}
        />
      )}

      <FormInput
        testID="blank-title"
        label={t('tabelSettings.docTitle')}
        value={draft.title ?? ''}
        placeholder={DEFAULT_BLANK_TITLE[doc]}
        onChangeText={(v) => set({ title: v })}
      />
      <FormInput
        testID="blank-footer"
        label={t('tabelSettings.footer')}
        value={draft.footer ?? ''}
        onChangeText={(v) => set({ footer: v })}
      />

      <SectionTitle>{t('tabelSettings.blocks')}</SectionTitle>
      {hint(t('tabelSettings.blocksHint'))}
      {blocksFor(doc).map((k) => (
        <SwitchRow
          key={k}
          testID={`blank-block-${k}`}
          label={t(BLOCK_LABEL[k])}
          value={blockOn(draft, k)}
          onChange={() => {
            setDraft((d) => toggleBlock(d, k));
            setError(null);
          }}
        />
      ))}
      {doc === 'decree' && blockOn(draft, 'city') && (
        <FormInput
          testID="blank-city-text"
          label={t('tabelSettings.blkCity')}
          value={draft.blocks?.city_text ?? ''}
          placeholder={t('tabelSettings.cityFromRegion')}
          onChangeText={(v) => set({ blocks: { ...(draft.blocks ?? {}), city_text: v } })}
        />
      )}

      <SectionTitle>{t('tabelSettings.margins')}</SectionTitle>
      {hint(t('tabelSettings.marginsHint'))}
      <View style={styles.grid}>
        {MARGIN_SIDES.map((side) => (
          <View key={side} style={styles.cell}>
            <DecimalField
              testID={`blank-margin-${side}`}
              label={t(`tabelSettings.margin_${side}`)}
              value={draft.margins?.[side]}
              onChange={(v) => set({ margins: { ...(draft.margins ?? {}), [side]: v } })}
            />
          </View>
        ))}
      </View>
      {hint(t('tabelSettings.blankWebOnly'))}

      {!!error && (
        <Text variant="label" tone="danger" testID="blank-error">
          {error}
        </Text>
      )}
      <Button
        testID="blank-save"
        label={t('common.save')}
        onPress={() => void submit()}
        loading={save.isPending}
        full
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { flexBasis: '45%', flexGrow: 1 },
});
