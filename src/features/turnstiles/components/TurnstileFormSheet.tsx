// Turniket qo'shish / tahrirlash (v2 `TurnstileModal` «Turniket» tabi): indeks kodi va nomi (majburiy),
// IP, port, qurilma kodi, ulanish turi (HikCentral / ISAPI), manzillar. `event_token` / `rtsp_stream_url`
// bu yerda yo'q — ro'yxat ularni qaytarmaydi, ekran o'qib bo'lmaydigan qiymatni «egallamaydi» (v2).
// Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { Button, Chip, SelectField, Sheet, Text } from '@/ui';
import { useSaveTurnstile } from '../api/mutations';
import {
  TREATY_TYPES,
  buildTurnstileBody,
  onlyDigits,
  seedTurnstileForm,
  toggleId,
  type TurnstileForm,
  type TurnstileRow,
} from '../utils/turnstiles';
import { LocationsPicker, useLocationNames } from './TurnstilesBits';

export function TurnstileFormSheet({ row, onClose }: { row: TurnstileRow | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<TurnstileForm>(() => seedTurnstileForm(row));
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const save = useSaveTurnstile();
  const { nameOf } = useLocationNames(null);
  // Tahrirda manzil nomlari qatorning o'zida bor — ro'yxat hali kelmagan bo'lsa ham.
  const known = new Map((row?.locations ?? []).map((l) => [l.id, l.name || `#${l.id}`]));
  const locName = (id: number) => known.get(id) ?? nameOf(id);

  const set = (p: Partial<TurnstileForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const submit = async () => {
    const r = buildTurnstileBody(form);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync({ id: row?.id ?? null, body: r.body });
      toast.success(t('turnstiles.saved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('turnstiles.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={row ? t('turnstiles.editTitle') : t('turnstiles.add')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <FormInput
          testID="turnstile-form-code"
          label={t('turnstiles.fieldIndexCode')}
          value={form.indexCode}
          onChangeText={(v) => set({ indexCode: v })}
          required
        />
        <Text variant="caption" tone="subtle" style={styles.hint}>
          {t('turnstiles.indexCodeHint')}
        </Text>
        <FormInput
          testID="turnstile-form-name"
          label={t('turnstiles.fieldName')}
          value={form.name}
          onChangeText={(v) => set({ name: v })}
          required
        />
        <View style={styles.pair}>
          <View style={styles.wide}>
            <FormInput
              testID="turnstile-form-ip"
              label={t('turnstiles.fieldIp')}
              value={form.ip}
              onChangeText={(v) => set({ ip: v })}
              placeholder="192.168.0.10"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flex}>
            <FormInput
              testID="turnstile-form-port"
              label={t('turnstiles.fieldPort')}
              value={form.port}
              onChangeText={(v) => set({ port: onlyDigits(v) })}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <FormInput
          testID="turnstile-form-dev-code"
          label={t('turnstiles.fieldDevCode')}
          value={form.devCode}
          onChangeText={(v) => set({ devCode: v })}
        />
        <Text variant="label" tone="muted">
          {t('turnstiles.fieldTreaty')}
        </Text>
        <View style={styles.chips}>
          {TREATY_TYPES.map((type) => (
            <Chip
              key={type}
              testID={`turnstile-form-treaty-${type}`}
              label={type}
              selected={form.treatyType === type}
              onPress={() => set({ treatyType: form.treatyType === type ? '' : type })}
            />
          ))}
        </View>
        <Text variant="caption" tone="subtle">
          {t('turnstiles.treatyHint')}
        </Text>
        <SelectField
          testID="turnstile-form-locations"
          label={t('turnstiles.fieldLocations')}
          value={form.locationIds.map(locName).join(', ')}
          placeholder={t('turnstiles.pickLocations')}
          icon="mapPin"
          onPress={() => setPicking(true)}
        />
        <Text variant="caption" tone="subtle">
          {t('turnstiles.locationsHint')}
        </Text>
        {!!error && (
          <Text variant="label" tone="danger" testID="turnstile-form-error">
            {error}
          </Text>
        )}
        <Button
          testID="turnstile-form-save"
          label={t('common.save')}
          onPress={() => void submit()}
          loading={save.isPending}
          full
        />
      </ScrollView>
      {picking && (
        <LocationsPicker
          branchId={null}
          selected={form.locationIds}
          onToggle={(id) => set({ locationIds: toggleId(form.locationIds, id) })}
          onClose={() => setPicking(false)}
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
  pair: { flexDirection: 'row', gap: 10 },
  wide: { flex: 2 },
  flex: { flex: 1 },
});
