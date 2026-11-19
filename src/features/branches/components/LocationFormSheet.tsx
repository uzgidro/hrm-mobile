// Manzil qo'shish / tahrirlash (v2 `LocationModal`): nom (majburiy), filial (ixtiyoriy — bo'sh bo'lsa
// biriktirilmaydi), manzil matni, koordinatalar (geofencing shu yerdan oziqlanadi). Ota `key` bilan mount.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, SelectField, Sheet, Text } from '@/ui';
import { useSaveLocation } from '../api/mutations';
import {
  branchName,
  buildLocationBody,
  seedLocationForm,
  type LocationForm,
  type LocationRow,
} from '../utils/branches';
import { useBranchNames } from './BranchesBits';

const NONE = -1;

export function LocationFormSheet({ row, onClose }: { row: LocationRow | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<LocationForm>(() => seedLocationForm(row));
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const save = useSaveLocation();
  const { branches, nameOf } = useBranchNames();

  const set = (p: Partial<LocationForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const r = buildLocationBody(form);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync({ id: row?.id ?? null, body: r.body });
      toast.success(t('branches.saved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('branches.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={row ? t('branches.editLocation') : t('branches.addLocation')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <FormInput
          testID="location-form-name"
          label={t('branches.fieldName')}
          value={form.name}
          onChangeText={(v) => set({ name: v })}
          required
        />
        <SelectField
          testID="location-form-branch"
          label={t('branches.fieldBranch')}
          value={form.branchId == null ? '' : nameOf(form.branchId)}
          placeholder={t('branches.noBranch')}
          icon="building"
          onPress={() => setPicking(true)}
        />
        <Text variant="caption" tone="subtle">
          {t('branches.locationBranchHint')}
        </Text>
        <FormInput
          testID="location-form-address"
          label={t('branches.fieldAddress')}
          value={form.address}
          onChangeText={(v) => set({ address: v })}
        />
        <View style={styles.pair}>
          <View style={styles.flex}>
            <FormInput
              testID="location-form-lat"
              label={t('branches.fieldLat')}
              value={form.lat}
              onChangeText={(v) => set({ lat: v })}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flex}>
            <FormInput
              testID="location-form-lon"
              label={t('branches.fieldLon')}
              value={form.lon}
              onChangeText={(v) => set({ lon: v })}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        {!!error && (
          <Text variant="label" tone="danger" testID="location-form-error">
            {error}
          </Text>
        )}
        <Button
          testID="location-form-save"
          label={t('common.save')}
          onPress={() => void submit()}
          loading={save.isPending}
          full
        />
      </ScrollView>
      {picking && (
        <PickerModal
          avatars={false}
          visible
          title={t('branches.fieldBranch')}
          options={[
            { value: NONE, label: t('branches.noBranch') },
            ...(branches.data ?? []).map((b) => ({ value: b.id, label: branchName(b) })),
          ]}
          loading={branches.isFetching}
          selected={form.branchId ?? NONE}
          onClose={() => setPicking(false)}
          onSelect={(v) => {
            setPicking(false);
            set({ branchId: v === NONE ? null : v });
          }}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  pair: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
