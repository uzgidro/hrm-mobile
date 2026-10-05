// Administrator qo'shish / tahrirlash (v2 `AdminModal`): pochta (majburiy), parol (ixtiyoriy, kiritilsa
// ≥ 8; yangisida bo'sh — bir martalik parol pochtaga; tahrirda bo'sh — joriy parol qoladi), filial
// (bo'sh — barcha filiallar). Parol maydoni yashirin va hech qayerda saqlanmaydi. Surat — web'da.
// Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { Button, SelectField, Sheet, Text } from '@/ui';
import { useSaveAdmin } from '../api/mutations';
import { buildAdminBody, seedAdminForm, type AdminForm, type AdminRow } from '../utils/users';
import { BranchPicker, useBranchName } from './UsersBits';

export function AdminFormSheet({ row, onClose }: { row: AdminRow | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<AdminForm>(() => seedAdminForm(row));
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const save = useSaveAdmin();
  const { nameOf } = useBranchName(form.branchId != null);

  const set = (p: Partial<AdminForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const r = buildAdminBody(form, !!row);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync({ id: row?.id ?? null, body: r.body });
      toast.success(t('users.adminSaved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('users.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={row ? t('users.editAdmin') : t('users.newAdmin')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <FormInput
          testID="admin-form-email"
          label={t('users.colAdmin')}
          value={form.email}
          onChangeText={(v) => set({ email: v })}
          keyboardType="email-address"
          required
        />
        <FormInput
          testID="admin-form-password"
          label={t('users.password')}
          value={form.password}
          onChangeText={(v) => set({ password: v })}
          secureTextEntry
        />
        <Text variant="caption" tone="subtle" style={styles.hint}>
          {row ? t('users.passwordKeepHint') : t('users.passwordEmailHint')}
        </Text>
        <SelectField
          testID="admin-form-branch"
          label={t('users.colBranch')}
          value={form.branchId == null ? '' : nameOf(form.branchId)}
          placeholder={t('users.allBranches')}
          icon="building"
          onPress={() => setPicking(true)}
        />
        <Text variant="caption" tone="subtle">
          {t('users.photoWebOnly')}
        </Text>
        {!!error && (
          <Text variant="label" tone="danger" testID="admin-form-error">
            {error}
          </Text>
        )}
        <Button
          testID="admin-form-save"
          label={t('common.save')}
          onPress={() => void submit()}
          loading={save.isPending}
          full
        />
      </ScrollView>
      {picking && (
        <BranchPicker
          visible
          selected={form.branchId}
          allLabel={t('users.allBranches')}
          onClose={() => setPicking(false)}
          onSelect={(id) => set({ branchId: id })}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  hint: { marginTop: -12 },
});
