// Kiosk hisobini qo'shish / tahrirlash (v2 `KioskUserModal`): login (faqat yaratishda — keyin
// o'zgarmaydi), nomi, parol (yaratishda ≥ 8 majburiy, tahrirda bo'sh = o'zgarmaydi; yashirin, hech
// qayerda saqlanmaydi), rol (serverning ruxsat ro'yxati), JShShIR (14 raqam), filiallar (kamida bitta
// — bu hisobning filiali boshqa joydan olinmaydi). Surat — web'da. Ota `key` bilan mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, Chip, SelectField, Sheet, Text } from '@/ui';
import { useSaveKiosk } from '../api/mutations';
import {
  KIOSK_ROLES,
  buildKioskBody,
  kioskRoleKey,
  maskPinfl,
  seedKioskForm,
  type KioskForm,
  type KioskUser,
} from '../utils/users';
import { KeyValue, useBranchName } from './UsersBits';

export function KioskFormSheet({ row, onClose }: { row: (KioskUser & { id: number }) | null; onClose: () => void }) {
  const { t } = useTranslation();
  const editing = !!row;
  const [form, setForm] = useState<KioskForm>(() => seedKioskForm(row));
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const save = useSaveKiosk();
  const { branches, nameOf } = useBranchName();

  const set = (p: Partial<KioskForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };
  const toggleBranch = (id: number) =>
    set({ branchIds: form.branchIds.includes(id) ? form.branchIds.filter((x) => x !== id) : [...form.branchIds, id] });

  const submit = async () => {
    const r = buildKioskBody(form, editing);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync({ id: row?.id ?? null, body: r.body });
      toast.success(t(editing ? 'users.kioskUpdated' : 'users.kioskCreated'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('users.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={editing ? t('users.kioskEditTitle') : t('users.kioskAdd')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {editing ? (
          <KeyValue label={t('users.kioskUsername')} value={row?.username} testID="kiosk-form-username-fixed" />
        ) : (
          <FormInput
            testID="kiosk-form-username"
            label={t('users.kioskUsername')}
            value={form.username}
            onChangeText={(v) => set({ username: v })}
            required
          />
        )}
        <FormInput
          testID="kiosk-form-name"
          label={t('users.kioskName')}
          value={form.legalName}
          onChangeText={(v) => set({ legalName: v })}
        />
        <FormInput
          testID="kiosk-form-password"
          label={t('users.kioskPassword')}
          value={form.password}
          onChangeText={(v) => set({ password: v })}
          secureTextEntry
          required={!editing}
        />
        <Text variant="caption" tone="subtle" style={styles.hint}>
          {editing ? t('users.kioskPasswordEditHint') : t('users.kioskPasswordShort')}
        </Text>
        <Text variant="label" tone="muted">
          {t('users.kioskRole')}
        </Text>
        <View style={styles.chips}>
          {KIOSK_ROLES.map((r) => (
            <Chip
              key={r}
              testID={`kiosk-form-role-${r}`}
              label={t(`users.kioskRole_${kioskRoleKey(r)}`)}
              selected={form.role === r}
              onPress={() => set({ role: r })}
            />
          ))}
        </View>
        <Text variant="caption" tone="subtle">
          {t('users.kioskRoleHint')}
        </Text>
        <FormInput
          testID="kiosk-form-pinfl"
          label={t('users.pinfl')}
          value={form.pinfl}
          onChangeText={(v) => set({ pinfl: maskPinfl(v) })}
          keyboardType="number-pad"
        />
        <SelectField
          testID="kiosk-form-branches"
          label={`${t('users.kioskBranches')} *`}
          value={form.branchIds.map(nameOf).join(', ')}
          placeholder={t('users.pickBranches')}
          icon="building"
          onPress={() => setPicking(true)}
        />
        <Text variant="caption" tone="subtle">
          {t('users.kioskBranchesHint')}
        </Text>
        <Text variant="caption" tone="subtle">
          {t('users.photoWebOnly')}
        </Text>
        {!!error && (
          <Text variant="label" tone="danger" testID="kiosk-form-error">
            {error}
          </Text>
        )}
        <Button
          testID="kiosk-form-save"
          label={t('common.save')}
          onPress={() => void submit()}
          loading={save.isPending}
          full
        />
      </ScrollView>
      {picking && (
        <PickerModal
          visible
          multiple
          title={t('users.kioskBranches')}
          avatars={false}
          options={(branches.data ?? []).map((b) => ({ value: b.id, label: b.name || `#${b.id}` }))}
          loading={branches.isFetching}
          selected={form.branchIds}
          onClose={() => setPicking(false)}
          onSelect={toggleBranch}
          onToggle={toggleBranch}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  hint: { marginTop: -12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
