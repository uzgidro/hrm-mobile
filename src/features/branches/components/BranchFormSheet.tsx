// Filial qo'shish / tahrirlash (v2 `BranchModal`): nom (majburiy), viloyatlar (filiallarning o'zidan
// olingan katalog — tanlanganlar tartibida, birinchisi asosiy), manzil, koordinatalar, tizimdagi roli
// (bosh filial, tibbiy markaz, umumiy turniket guruhi). Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { FormInput } from '@/components/FormInput';
import { Button, Card, Chip, Sheet, Text } from '@/ui';
import { useSaveBranch } from '../api/mutations';
import { branchActionError } from './BranchesBits';
import {
  buildBranchBody,
  knownRegions,
  seedBranchForm,
  toggleRegion,
  type BranchForm,
  type BranchRow,
} from '../utils/branches';

export function BranchFormSheet({
  row,
  branches,
  onClose,
}: {
  row: BranchRow | null;
  branches: BranchRow[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [form, setForm] = useState<BranchForm>(() => seedBranchForm(row));
  const [error, setError] = useState<string | null>(null);
  const save = useSaveBranch();
  // Tanlanganlar o'z tartibida (birinchisi — asosiy viloyat), qolganlari alifbo bo'yicha.
  const regions = [...form.regions, ...knownRegions(branches).filter((r) => !form.regions.includes(r))];

  const set = (p: Partial<BranchForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const r = buildBranchBody(form);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync({ id: row?.id ?? null, body: r.body });
      toast.success(t('branches.saved'));
      onClose();
    } catch (e) {
      // Server maydon xatosi (`validation_error`) — o'z matni; doiradan tashqari filial — tushunarli matn.
      setError(branchActionError(e, t));
    }
  };

  const toggle = (id: string, label: string, hint: string, value: boolean, onChange: (v: boolean) => void) => (
    <View>
      <View style={styles.switchRow}>
        <Text variant="body" style={styles.flex}>
          {label}
        </Text>
        <Switch
          testID={id}
          value={value}
          onValueChange={onChange}
          trackColor={{ false: c.border, true: c.brand }}
          thumbColor={c.surface}
        />
      </View>
      <Text variant="caption" tone="subtle">
        {hint}
      </Text>
    </View>
  );

  return (
    <Sheet visible onClose={onClose} title={row ? t('branches.editTitle') : t('branches.add')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <FormInput
          testID="branch-form-name"
          label={t('branches.fieldName')}
          value={form.name}
          onChangeText={(v) => set({ name: v })}
          required
        />
        <Text variant="label" tone="muted">
          {t('branches.fieldRegions')}
        </Text>
        {regions.length > 0 ? (
          <View style={styles.chips}>
            {regions.map((r) => (
              <Chip
                key={r}
                testID={`branch-form-region-${r}`}
                label={r}
                selected={form.regions.includes(r)}
                onPress={() => set({ regions: toggleRegion(form.regions, r) })}
              />
            ))}
          </View>
        ) : (
          <Text variant="caption" tone="subtle">
            {t('branches.noRegions')}
          </Text>
        )}
        <Text variant="caption" tone="subtle">
          {t('branches.regionsHint')}
        </Text>
        <FormInput
          testID="branch-form-address"
          label={t('branches.fieldAddress')}
          value={form.address}
          onChangeText={(v) => set({ address: v })}
        />
        <View style={styles.pair}>
          <View style={styles.flex}>
            <FormInput
              testID="branch-form-lat"
              label={t('branches.fieldLat')}
              value={form.lat}
              onChangeText={(v) => set({ lat: v })}
              placeholder="41.29950"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flex}>
            <FormInput
              testID="branch-form-lon"
              label={t('branches.fieldLon')}
              value={form.lon}
              onChangeText={(v) => set({ lon: v })}
              placeholder="69.24010"
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <Card title={t('branches.topologyTitle')} icon="building" tint="grey">
          <View style={styles.topology}>
            {toggle(
              'branch-form-head-office',
              t('branches.isHeadOffice'),
              t('branches.isHeadOfficeHint'),
              form.isHeadOffice,
              (v) => set({ isHeadOffice: v }),
            )}
            {toggle(
              'branch-form-medical',
              t('branches.isMedicalCenter'),
              t('branches.isMedicalCenterHint'),
              form.isMedicalCenter,
              (v) => set({ isMedicalCenter: v }),
            )}
            <FormInput
              testID="branch-form-terminal-group"
              label={t('branches.terminalGroup')}
              value={form.terminalGroup}
              onChangeText={(v) => set({ terminalGroup: v })}
              placeholder={t('branches.terminalGroupPlaceholder')}
            />
            <Text variant="caption" tone="subtle" style={styles.hint}>
              {t('branches.terminalGroupHint')}
            </Text>
          </View>
        </Card>
        {!!error && (
          <Text variant="label" tone="danger" testID="branch-form-error">
            {error}
          </Text>
        )}
        <Button
          testID="branch-form-save"
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
  hint: { marginTop: -12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pair: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  topology: { gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
});
