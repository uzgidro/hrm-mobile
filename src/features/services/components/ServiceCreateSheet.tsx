// Yangi so'rov (v2 ServiceCreateModal): tur, maqsad; nomzodlik arizasida
// ariza beruvchi ma'lumoti va filial. Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { ORGANIZATION_BRANCHES } from '@/api/urls';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, Chip, SelectField, Sheet, Text } from '@/ui';
import type { OrganizationBranch } from '@/types';
import type { ServiceCatalogItem } from '../api/queries';
import { useCreateServiceRequest } from '../api/mutations';
import { buildCreateBody, validateCreate, type CreateForm } from '../utils/services';

export function ServiceCreateSheet({
  catalog,
  initialType,
  onClose,
}: {
  catalog: ServiceCatalogItem[];
  initialType: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const available = catalog.filter((c) => c.available);
  const [form, setForm] = useState<CreateForm>({
    type: initialType || available[0]?.type || '',
    purpose: '',
    branchId: null,
    lastName: '',
    firstName: '',
    middleName: '',
    position: '',
    phone: '',
    note: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [pickBranch, setPickBranch] = useState(false);
  const create = useCreateServiceRequest();
  const app = form.type === 'job_application';
  const branches = useQuery({
    queryKey: ['services', 'branches'],
    queryFn: () => apiClient.get(ORGANIZATION_BRANCHES).then((r) => unwrapList<OrganizationBranch>(r.data)),
    enabled: app,
    staleTime: 30 * 60 * 1000,
  });

  const set = (p: Partial<CreateForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const err = validateCreate(form);
    if (err) return setError(t(`services.${err}`));
    try {
      await create.mutateAsync(buildCreateBody(form));
      toast.success(t('services.submitted'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('services.submitFailed')));
    }
  };

  return (
    <Sheet scroll visible onClose={onClose} title={t('services.newRequest')}>
      <View style={styles.form}>
        <Text variant="label" tone="muted">
          {t('services.serviceType')}
        </Text>
        <View style={styles.chips}>
          {available.map((c) => (
            <Chip
              key={c.type}
              testID={`service-type-${c.type}`}
              label={t(`services.type_${c.type}`, { defaultValue: c.label })}
              selected={form.type === c.type}
              onPress={() => set({ type: c.type })}
            />
          ))}
        </View>
        <FormInput
          testID="service-purpose"
          label={t('services.purpose')}
          value={form.purpose}
          onChangeText={(v) => set({ purpose: v })}
          multiline
        />
        <Text variant="caption" tone="subtle">
          {t('services.purposeHint')}
        </Text>
        {app && (
          <>
            <FormInput
              label={t('services.lastName')}
              value={form.lastName}
              onChangeText={(v) => set({ lastName: v })}
              required
            />
            <FormInput
              label={t('services.firstName')}
              value={form.firstName}
              onChangeText={(v) => set({ firstName: v })}
            />
            <FormInput
              label={t('services.middleName')}
              value={form.middleName}
              onChangeText={(v) => set({ middleName: v })}
            />
            <FormInput
              label={t('services.desiredPosition')}
              value={form.position}
              onChangeText={(v) => set({ position: v })}
            />
            <FormInput
              label={t('services.phone')}
              value={form.phone}
              onChangeText={(v) => set({ phone: v })}
              keyboardType="phone-pad"
            />
            <SelectField
              label={t('services.branch')}
              value={branches.data?.find((b) => b.id === form.branchId)?.name ?? ''}
              icon="building"
              onPress={() => setPickBranch(true)}
            />
          </>
        )}
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button
          testID="service-send"
          label={t('services.send')}
          onPress={submit}
          loading={create.isPending}
          full
          size="lg"
        />
      </View>
      <PickerModal
        avatars={false}
        visible={pickBranch}
        title={t('services.branch')}
        options={(branches.data ?? []).map((b) => ({ value: b.id, label: b.name ?? `#${b.id}` }))}
        loading={branches.isFetching}
        selected={form.branchId}
        onClose={() => setPickBranch(false)}
        onSelect={(id) => {
          set({ branchId: id });
          setPickBranch(false);
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
