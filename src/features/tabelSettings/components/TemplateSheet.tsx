// Tabel blanki konstruktori (web v2 `TabelTemplateBuilder`): the HR picks the form's columns, headers, day codes and
// options; «namuna» downloads the .xlsx without saving, «Saqlash» builds it and stores it as the branch's template.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { downloadAndSave } from '@/lib/saveFile';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { Button, Card, Chip, IconButton, Segmented, Sheet, Text } from '@/ui';
import { tabelSampleRequest, useBuildTabelTemplate } from '../api/mutations';
import type { TabelBranch } from '../utils/tabelConfig';
import {
  ALWAYS_IDENTITY,
  builderBody,
  moveItem,
  previewHeaders,
  seedBuilder,
  summaryLabel,
  toggleIdentity,
  type BuilderState,
  type NameFormat,
  type PresentCell,
  type TabelTemplateColumns,
  type TabelTemplateOptions,
} from '../utils/tabelTemplate';
import { SectionTitle, SwitchRow } from './TabelBits';

export function TemplateSheet({
  branch,
  catalog,
  initial,
  detectedCodes,
  hasTemplate,
  onClose,
}: {
  branch: TabelBranch;
  catalog: TabelTemplateColumns;
  /** Options of the saved constructor form, when editing. */
  initial: TabelTemplateOptions | null;
  detectedCodes?: Record<string, string>;
  /** The branch already has a template — building replaces it. */
  hasTemplate: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const build = useBuildTabelTemplate();
  const [s, setS] = useState<BuilderState>(() => seedBuilder(catalog, initial, detectedCodes));
  const [busy, setBusy] = useState<'sample' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<BuilderState>) => {
    setS((cur) => ({ ...cur, ...p }));
    setError(null);
  };

  const identityCols = catalog.identity.filter((c) => !ALWAYS_IDENTITY.has(c.key));
  const rest = catalog.summary.filter((c) => !s.summary.includes(c.key));
  const headers = useMemo(() => previewHeaders(s, catalog), [s, catalog]);

  const sample = async () => {
    setBusy('sample');
    setError(null);
    try {
      await downloadAndSave(tabelSampleRequest(branch.id, builderBody(s, catalog)), 'tabel-blank-konstruktor.xlsx');
    } catch (e) {
      setError(getApiErrorMessage(e, t('tabelSettings.tplcSampleFail')));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (s.summary.length === 0) {
      setError(t('tabelSettings.tplcNeedSummary'));
      return;
    }
    if (hasTemplate) {
      const ok = await confirm({
        title: t('tabelSettings.tplcTitle'),
        message: t('tabelSettings.tplcReplaceConfirm'),
        confirmLabel: t('tabelSettings.tplcSave'),
        cancelLabel: t('common.cancel'),
      });
      if (!ok) return;
    }
    try {
      await build.mutateAsync({ id: branch.id, options: builderBody(s, catalog) });
      toast.success(t('tabelSettings.tplcSaved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('tabelSettings.tplcFail')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={t('tabelSettings.tplcTitle')} scroll>
      <View style={styles.body} testID="tabel-builder">
        <Text variant="caption" tone="muted">
          {branch.name}
        </Text>

        <SectionTitle>{t('tabelSettings.tplcIdentity')}</SectionTitle>
        <Text variant="caption" tone="subtle">
          {t('tabelSettings.tplcIdentityHint')}
        </Text>
        <View style={styles.chips}>
          {identityCols.map((c) => (
            <Chip
              key={c.key}
              testID={`tplc-identity-${c.key}`}
              label={c.label}
              selected={s.identity.includes(c.key)}
              onPress={() => set({ identity: toggleIdentity(catalog, s.identity, c.key) })}
            />
          ))}
        </View>

        <SectionTitle>{t('tabelSettings.tplcSummary')}</SectionTitle>
        <Text variant="caption" tone="subtle">
          {t('tabelSettings.tplcSummaryHint')}
        </Text>
        {s.summary.map((key) => (
          <View key={key} style={styles.summaryRow} testID={`tplc-summary-${key}`}>
            <View style={styles.flex}>
              <FormInput
                label={summaryLabel(catalog, key)}
                value={s.labels[key] ?? ''}
                onChangeText={(v) => set({ labels: { ...s.labels, [key]: v } })}
                placeholder={t('tabelSettings.tplcRename')}
                testID={`tplc-label-${key}`}
              />
            </View>
            <IconButton
              icon="arrowUp"
              accessibilityLabel={t('tabelSettings.tplcMoveUp')}
              onPress={() => set({ summary: moveItem(s.summary, key, -1) })}
              testID={`tplc-up-${key}`}
            />
            <IconButton
              icon="arrowDown"
              accessibilityLabel={t('tabelSettings.tplcMoveDown')}
              onPress={() => set({ summary: moveItem(s.summary, key, 1) })}
              testID={`tplc-down-${key}`}
            />
            <IconButton
              icon="close"
              accessibilityLabel={t('common.delete')}
              onPress={() => set({ summary: s.summary.filter((k) => k !== key) })}
              testID={`tplc-remove-${key}`}
            />
          </View>
        ))}
        {rest.length > 0 && (
          <>
            <Text variant="label" tone="muted">
              {t('tabelSettings.tplcAvailable')}
            </Text>
            <View style={styles.chips}>
              {rest.map((c) => (
                <Chip
                  key={c.key}
                  testID={`tplc-add-${c.key}`}
                  label={`+ ${c.label}`}
                  onPress={() => set({ summary: [...s.summary, c.key] })}
                />
              ))}
            </View>
          </>
        )}

        <SectionTitle>{t('tabelSettings.tplcOptions')}</SectionTitle>
        <SwitchRow label={t('tabelSettings.tplcGroup')} value={s.group} onChange={(v) => set({ group: v })} testID="tplc-group" />
        <SwitchRow label={t('tabelSettings.tplcWeekend')} value={s.weekend} onChange={(v) => set({ weekend: v })} testID="tplc-weekend" />
        <SwitchRow label={t('tabelSettings.tplcLegend')} value={s.legend} onChange={(v) => set({ legend: v })} testID="tplc-legend" />
        <Text variant="label" tone="muted">
          {t('tabelSettings.tplcNameFormat')}
        </Text>
        <Segmented<NameFormat>
          testID="tplc-name-format"
          value={s.nameFormat}
          onChange={(v) => set({ nameFormat: v })}
          options={[
            { value: 'name', label: t('tabelSettings.tplcNameFull') },
            { value: 'short_name', label: t('tabelSettings.tplcNameShort') },
            { value: 'initials', label: t('tabelSettings.tplcNameInitials') },
          ]}
        />
        <Text variant="label" tone="muted">
          {t('tabelSettings.tplcPresent')}
        </Text>
        <Segmented<PresentCell>
          testID="tplc-present"
          value={s.present}
          onChange={(v) => set({ present: v })}
          options={[
            { value: '{norm}', label: t('tabelSettings.tplcPresentNorm') },
            { value: '{hours}', label: t('tabelSettings.tplcPresentHours') },
          ]}
        />

        <SectionTitle>{t('tabelSettings.tplcCodes')}</SectionTitle>
        <Text variant="caption" tone="subtle">
          {t('tabelSettings.tplcCodesHint')}
        </Text>
        {catalog.codes.map((c) => (
          <View key={c.key} style={styles.codeRow}>
            <Text variant="caption" style={styles.flex}>
              {c.label}
            </Text>
            <View style={styles.codeInput}>
              <FormInput
                label=""
                value={s.codes[c.key] ?? ''}
                onChangeText={(v) => set({ codes: { ...s.codes, [c.key]: v.slice(0, 6) } })}
                testID={`tplc-code-${c.key}`}
              />
            </View>
          </View>
        ))}

        <SectionTitle>{t('tabelSettings.tplcPreview')}</SectionTitle>
        <Card testID="tplc-preview">
          <Text variant="caption">{headers.join(' | ')}</Text>
        </Card>
        <Text variant="caption" tone="subtle">
          {t('tabelSettings.tplcPreviewNote')}
        </Text>

        {!!error && (
          <Text variant="caption" tone="danger" testID="tplc-error">
            {error}
          </Text>
        )}
        <Button
          testID="tplc-sample"
          label={t('tabelSettings.tplcViewExcel')}
          icon="arrowDown"
          variant="soft"
          loading={busy === 'sample'}
          disabled={build.isPending || s.summary.length === 0}
          onPress={() => void sample()}
          full
        />
        <Button
          testID="tplc-save"
          label={t('tabelSettings.tplcSave')}
          icon="check"
          loading={build.isPending}
          disabled={busy !== null}
          onPress={() => void save()}
          full
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flex: { flex: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeInput: { width: 90 },
});
