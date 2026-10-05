// Tabel sozlamalari varag'i (v2 `TabelConfigModal`): tasdiqlovchi, tabel sarlavhasi, ro'yxat raqami
// (prefiks, boshlang'ich, keyingi raqam), guvohnoma raqami, avtomatik to'liq ish kuni, kechikish imtiyozi,
// filial ish vaqti, imzo egalari — tahrirlanadi. Excel shabloni, shtamp va undagi matn joylashuvi — faqat
// holat (shablonni olib tashlash mumkin); yuklash, yuklab olish va joylashuvni ko'rib to'g'rilash — web'da.
// `branch` ro'yxatdan jonli o'qiladi (shablon olib tashlansa holat darhol yangilanadi), forma esa bir marta
// to'ldiriladi. Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { isHttpUrl } from '@/utils/safeUrl';
import { FormInput } from '@/components/FormInput';
import { Button, IconButton, Sheet, Text } from '@/ui';
import { nextRegNumberQuery } from '../api/queries';
import { useRemoveTabelTemplate, useSaveTabelConfig } from '../api/mutations';
import {
  buildConfigBody,
  canPreviewNumber,
  effectiveConfig,
  sanitizeStampCoords,
  seedConfigForm,
  tabelTemplateName,
  type ConfigForm,
  type TabelBranch,
  type TabelSigner,
} from '../utils/tabelConfig';
import { ClockField, KeyValue, SectionTitle, SwitchRow } from './TabelBits';

export function ConfigSheet({ branch, onClose }: { branch: TabelBranch; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState<ConfigForm>(() => seedConfigForm(branch));
  const [error, setError] = useState<string | null>(null);
  const save = useSaveTabelConfig();
  const removeTpl = useRemoveTabelTemplate();
  const next = useQuery(nextRegNumberQuery(branch.id, canPreviewNumber(user, branch.id)));
  const template = tabelTemplateName(branch);
  const coords = sanitizeStampCoords(effectiveConfig(branch).stamp_coords);
  const stamp = isHttpUrl(branch.stamp_path) ? branch.stamp_path : null;

  const set = (p: Partial<ConfigForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };
  const setSigner = (i: number, p: Partial<TabelSigner>) =>
    set({ signers: form.signers.map((s, idx) => (idx === i ? { ...s, ...p } : s)) });

  const submit = async () => {
    try {
      await save.mutateAsync({ id: branch.id, body: buildConfigBody(form, branch) });
      toast.success(t('tabelSettings.saved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('tabelSettings.saveFail')));
    }
  };

  const dropTemplate = async () => {
    const ok = await confirm({
      title: t('tabelSettings.tplRemove'),
      message: t('tabelSettings.tplRemoveConfirm', { name: template ?? '' }),
      confirmLabel: t('tabelSettings.tplRemove'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeTpl.mutateAsync(branch.id);
      toast.success(t('tabelSettings.tplRemoved'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('tabelSettings.actionFailed')));
    }
  };

  const pair = (a: React.ReactNode, b: React.ReactNode) => (
    <View style={styles.pair}>
      <View style={styles.flex}>{a}</View>
      <View style={styles.flex}>{b}</View>
    </View>
  );
  const hint = (text: string) => (
    <Text variant="caption" tone="subtle">
      {text}
    </Text>
  );
  const xy = (v: [number, number]) => `X ${v[0]} · Y ${v[1]}`;

  return (
    <Sheet visible onClose={onClose} title={t('tabelSettings.cfgTitle')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="caption" tone="subtle">
          {branch.name || `#${branch.id}`}
        </Text>

        <SectionTitle>{t('tabelSettings.secApprover')}</SectionTitle>
        <FormInput
          testID="cfg-approver-org"
          label={t('tabelSettings.fieldOrg')}
          value={form.approverOrg}
          onChangeText={(v) => set({ approverOrg: v })}
        />
        {pair(
          <FormInput
            testID="cfg-approver-title"
            label={t('tabelSettings.fieldPosition')}
            value={form.approverTitle}
            onChangeText={(v) => set({ approverTitle: v })}
          />,
          <FormInput
            testID="cfg-approver-name"
            label={t('tabelSettings.fieldShortName')}
            value={form.approverName}
            onChangeText={(v) => set({ approverName: v })}
          />,
        )}
        <FormInput
          testID="cfg-title-prefix"
          label={t('tabelSettings.fieldTitlePrefix')}
          value={form.titlePrefix}
          onChangeText={(v) => set({ titlePrefix: v })}
          multiline
        />

        <SectionTitle>{t('tabelSettings.secRegNum')}</SectionTitle>
        {pair(
          <FormInput
            testID="cfg-bildirgi-prefix"
            label={t('tabelSettings.fieldPrefix')}
            value={form.bildirgiPrefix}
            onChangeText={(v) => set({ bildirgiPrefix: v })}
          />,
          <FormInput
            testID="cfg-registration-start"
            label={t('tabelSettings.fieldStart')}
            value={form.registrationStart}
            onChangeText={(v) => set({ registrationStart: v })}
            keyboardType="number-pad"
          />,
        )}
        <View style={[styles.next, { backgroundColor: c.dropSoft, borderColor: c.border }]}>
          <View style={styles.flex}>
            <Text variant="caption" tone="subtle">
              {t('tabelSettings.nextNumLabel')}
            </Text>
            <Text variant="heading" testID="cfg-next-number">
              {next.data?.next_number || '—'}
            </Text>
          </View>
          <View style={styles.right}>
            <Text variant="caption" tone="subtle">
              {t('tabelSettings.lastNumLabel')}
            </Text>
            <Text variant="label" tone="muted">
              {next.data?.last_number || '—'}
            </Text>
          </View>
        </View>
        {!!next.data?.detail && (
          <Text variant="caption" tone="danger">
            {next.data.detail}
          </Text>
        )}
        {hint(t('tabelSettings.regNumHint'))}

        <SectionTitle>{t('tabelSettings.secGuvohnoma')}</SectionTitle>
        {pair(
          <FormInput
            testID="cfg-guvohnoma-prefix"
            label={t('tabelSettings.fieldPrefix')}
            value={form.guvohnomaPrefix}
            onChangeText={(v) => set({ guvohnomaPrefix: v })}
          />,
          <FormInput
            testID="cfg-guvohnoma-start"
            label={t('tabelSettings.fieldStart')}
            value={form.guvohnomaStart}
            onChangeText={(v) => set({ guvohnomaStart: v })}
            keyboardType="number-pad"
          />,
        )}
        {hint(t('tabelSettings.guvohnomaHint'))}

        <SectionTitle>{t('tabelSettings.secAutoFullDay')}</SectionTitle>
        <SwitchRow
          testID="cfg-auto-full-day"
          label={t('tabelSettings.fieldAutoFullDay')}
          hint={t('tabelSettings.autoFullDayHint')}
          value={form.autoFullDay}
          onChange={(v) => set({ autoFullDay: v })}
        />

        <SectionTitle>{t('tabelSettings.secLate')}</SectionTitle>
        <FormInput
          testID="cfg-late-grace"
          label={t('tabelSettings.fieldLateGrace')}
          value={form.lateGrace}
          onChangeText={(v) => set({ lateGrace: v })}
          placeholder={t('tabelSettings.lateGracePlaceholder')}
          keyboardType="number-pad"
        />
        {hint(t('tabelSettings.lateGraceHint'))}

        <SectionTitle>{t('tabelSettings.secWorkDay')}</SectionTitle>
        <ClockField
          testID="cfg-work-start"
          label={t('tabelSettings.fieldWorkStart')}
          value={form.workStart}
          onChange={(v) => set({ workStart: v })}
        />
        <ClockField
          testID="cfg-work-end"
          label={t('tabelSettings.fieldWorkEnd')}
          value={form.workEnd}
          onChange={(v) => set({ workEnd: v })}
        />
        <ClockField
          testID="cfg-lunch-start"
          label={t('tabelSettings.fieldLunchStart')}
          value={form.lunchStart}
          onChange={(v) => set({ lunchStart: v })}
        />
        <ClockField
          testID="cfg-lunch-end"
          label={t('tabelSettings.fieldLunchEnd')}
          value={form.lunchEnd}
          onChange={(v) => set({ lunchEnd: v })}
        />
        {hint(t('tabelSettings.workDayHint'))}

        <View style={styles.signersHead}>
          <View style={styles.flex}>
            <SectionTitle>{t('tabelSettings.secSigners')}</SectionTitle>
          </View>
          <Button
            testID="cfg-signer-add"
            label={t('tabelSettings.addSigner')}
            icon="plus"
            size="sm"
            variant="link"
            onPress={() => set({ signers: [...form.signers, { position: '', name: '' }] })}
          />
        </View>
        {form.signers.map((s, i) => (
          <View key={i} style={[styles.signer, { borderColor: c.border }]}>
            <View style={styles.flex}>
              <FormInput
                testID={`cfg-signer-position-${i}`}
                label={t('tabelSettings.signerPosition')}
                value={s.position}
                onChangeText={(v) => setSigner(i, { position: v })}
              />
              <FormInput
                testID={`cfg-signer-name-${i}`}
                label={t('tabelSettings.signerName')}
                value={s.name}
                onChangeText={(v) => setSigner(i, { name: v })}
              />
            </View>
            <IconButton
              testID={`cfg-signer-remove-${i}`}
              icon="trash"
              accessibilityLabel={t('common.delete')}
              onPress={() => set({ signers: form.signers.filter((_, idx) => idx !== i) })}
            />
          </View>
        ))}

        <SectionTitle>{t('tabelSettings.secTemplate')}</SectionTitle>
        <KeyValue
          label={t('tabelSettings.tplFile')}
          value={template ?? t('tabelSettings.tplNone')}
          testID="cfg-template"
        />
        {template ? (
          <Button
            testID="cfg-template-remove"
            label={t('tabelSettings.tplRemove')}
            icon="trash"
            variant="dangerGhost"
            onPress={() => void dropTemplate()}
            loading={removeTpl.isPending}
            full
          />
        ) : null}

        <SectionTitle>{t('tabelSettings.secStamp')}</SectionTitle>
        {stamp ? (
          <View style={[styles.stampBox, { borderColor: c.border, backgroundColor: c.surface2 }]}>
            <Image
              source={{ uri: stamp }}
              style={styles.stamp}
              contentFit="contain"
              accessibilityLabel={t('tabelSettings.secStamp')}
            />
          </View>
        ) : (
          <KeyValue label={t('tabelSettings.colStamp')} value={t('tabelSettings.stampNone')} testID="cfg-stamp" />
        )}
        {hint(t('tabelSettings.stampHint'))}
        <Text variant="label" tone="muted">
          {t('tabelSettings.secCoords')}
        </Text>
        <KeyValue label={t('tabelSettings.coordNumber')} value={xy(coords.number)} testID="cfg-coord-number" />
        <KeyValue label={t('tabelSettings.coordDay')} value={xy(coords.day)} />
        <KeyValue label={t('tabelSettings.coordMonth')} value={xy(coords.month)} />
        <KeyValue label={t('tabelSettings.coordYear')} value={xy(coords.year)} />
        <KeyValue label={t('tabelSettings.coordFont')} value={String(coords.font_pct)} />
        {hint(t('tabelSettings.cfgWebOnly'))}

        {!!error && (
          <Text variant="label" tone="danger" testID="cfg-error">
            {error}
          </Text>
        )}
        <Button
          testID="cfg-save"
          label={t('common.save')}
          onPress={() => void submit()}
          loading={save.isPending}
          full
        />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  pair: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  signersHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stampBox: { alignItems: 'center', padding: 8, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  stamp: { width: 160, height: 110 },
});
