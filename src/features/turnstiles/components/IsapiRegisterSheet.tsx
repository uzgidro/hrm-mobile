// ISAPI terminalini ro'yxatga olish (v2 `IsapiDeviceModal`): server avval qurilmaga ULANADI, keyin
// yozadi — noto'g'ri IP/parol shu yerda xato beradi, «qog'ozdagi» turniket qolmaydi. Yo'nalish butun
// terminalga tegishli (kirish va chiqish — alohida terminal); kamida bitta manzil shart (turniket filialga
// aynan manzil orqali bog'lanadi). Filial faqat manzillarni saralaydi — almashsa tanlangan manzillar
// tozalanadi. Parol yashirin, faqat so'rov tanasida (mutatsiya `gcTime: 0`). Ota `key` bilan mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, Segmented, SelectField, Sheet, Text } from '@/ui';
import { turnstileBranchesQuery } from '../api/queries';
import { useRegisterIsapi } from '../api/mutations';
import { EMPTY_ISAPI, buildIsapiBody, onlyDigits, toggleId, type IsapiForm } from '../utils/turnstiles';
import { IP_KEYBOARD, LocationsPicker, useLocationNames } from './TurnstilesBits';

export function IsapiRegisterSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<IsapiForm>(EMPTY_ISAPI);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<'branch' | 'locations' | null>(null);
  const register = useRegisterIsapi();
  const branches = useQuery({ ...turnstileBranchesQuery(), enabled: picking === 'branch' || form.branchId != null });
  const { nameOf } = useLocationNames(form.branchId, form.branchId != null);
  const branchLabel = (id: number) => branches.data?.find((b) => b.id === id)?.name || `#${id}`;

  const set = (p: Partial<IsapiForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const r = buildIsapiBody(form);
    if (!r.ok) return setError(t(r.error));
    try {
      await register.mutateAsync(r.body);
      toast.success(t('turnstiles.isapiRegistered'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('turnstiles.isapiUnreachable')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={t('turnstiles.isapiAdd')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="caption" tone="muted">
          {t('turnstiles.isapiAddHint')}
        </Text>
        <FormInput
          testID="isapi-form-name"
          label={t('turnstiles.fieldName')}
          value={form.name}
          onChangeText={(v) => set({ name: v })}
        />
        <Text variant="caption" tone="subtle" style={styles.hint}>
          {t('turnstiles.isapiNameHint')}
        </Text>
        <View style={styles.pair}>
          <View style={styles.wide}>
            <FormInput
              testID="isapi-form-ip"
              label={t('turnstiles.fieldIp')}
              value={form.ip}
              onChangeText={(v) => set({ ip: v })}
              placeholder="10.2.90.6"
              keyboardType={IP_KEYBOARD}
              required
            />
          </View>
          <View style={styles.flex}>
            <FormInput
              testID="isapi-form-port"
              label={t('turnstiles.fieldPort')}
              value={form.port}
              onChangeText={(v) => set({ port: onlyDigits(v) })}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <FormInput
          testID="isapi-form-login"
          label={t('turnstiles.isapiLogin')}
          value={form.username}
          onChangeText={(v) => set({ username: v })}
        />
        <FormInput
          testID="isapi-form-password"
          label={t('turnstiles.isapiPassword')}
          value={form.password}
          onChangeText={(v) => set({ password: v })}
          secureTextEntry
          required
        />
        <Text variant="label" tone="muted">
          {t('turnstiles.isapiDirection')}
        </Text>
        <Segmented
          testID="isapi-form-direction"
          value={form.direction}
          onChange={(v) => set({ direction: v })}
          options={[
            { value: 'entrance', label: t('turnstiles.dirEntrance') },
            { value: 'exit', label: t('turnstiles.dirExit') },
          ]}
        />
        <Text variant="caption" tone="subtle">
          {t('turnstiles.isapiDirectionHint')}
        </Text>
        <SelectField
          testID="isapi-form-branch"
          label={t('turnstiles.fieldBranch')}
          value={form.branchId == null ? '' : branchLabel(form.branchId)}
          placeholder={t('turnstiles.pickBranch')}
          icon="building"
          onPress={() => setPicking('branch')}
        />
        <Text variant="caption" tone="subtle">
          {t('turnstiles.branchHint')}
        </Text>
        <SelectField
          testID="isapi-form-locations"
          label={`${t('turnstiles.fieldLocations')} *`}
          value={form.locationIds.map(nameOf).join(', ')}
          placeholder={form.branchId == null ? t('turnstiles.isapiPickBranchFirst') : t('turnstiles.pickLocations')}
          icon="mapPin"
          disabled={form.branchId == null}
          onPress={() => setPicking('locations')}
        />
        <Text variant="caption" tone="subtle">
          {t('turnstiles.isapiLocationHint')}
        </Text>
        {!!error && (
          <Text variant="label" tone="danger" testID="isapi-form-error">
            {error}
          </Text>
        )}
        <Button
          testID="isapi-form-save"
          label={t('turnstiles.isapiConnectAndAdd')}
          onPress={() => void submit()}
          loading={register.isPending}
          full
        />
      </ScrollView>
      {picking === 'branch' && (
        <PickerModal
          avatars={false}
          visible
          title={t('turnstiles.fieldBranch')}
          options={(branches.data ?? []).map((b) => ({ value: b.id, label: b.name || `#${b.id}` }))}
          loading={branches.isFetching}
          selected={form.branchId}
          onClose={() => setPicking(null)}
          onSelect={(id) => {
            setPicking(null);
            // Manzillar filialga tegishli — eskilari boshqa filial manzili bo'lib qolmasin (v2).
            if (id !== form.branchId) set({ branchId: id, locationIds: [] });
          }}
        />
      )}
      {picking === 'locations' && form.branchId != null && (
        <LocationsPicker
          branchId={form.branchId}
          selected={form.locationIds}
          onToggle={(id) => set({ locationIds: toggleId(form.locationIds, id) })}
          onClose={() => setPicking(null)}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  hint: { marginTop: -12 },
  pair: { flexDirection: 'row', gap: 10 },
  wide: { flex: 2 },
  flex: { flex: 1 },
});
