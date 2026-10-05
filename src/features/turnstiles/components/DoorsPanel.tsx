// Turniket ichidagi eshiklar (v2 `TurnstileDoorsPanel`). Eshikning yo'nalishi — davomat kelish/ketishni
// AYNAN shundan o'qiydi, shuning uchun u saqlash tugmasisiz DARHOL qo'llanadi (tasdiq bilan — har bir
// o'tish qayta belgilanadi). Belgilanmagan yo'nalish ogohlantiriladi. Qo'lda eshik qo'shish — sinxron
// qamray olmagan holat uchun; o'chirish — tasdiq bilan.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { FormInput } from '@/components/FormInput';
import { Button, EmptyState, ErrorState, IconButton, Segmented, Skeleton, Text } from '@/ui';
import { turnstileDoorsQuery } from '../api/queries';
import { useCreateDoor, useDeleteDoor, useSetDoorDirection } from '../api/mutations';
import {
  EMPTY_DOOR,
  buildDoorBody,
  doorDirection,
  type Direction,
  type DoorForm,
  type TurnstileDoor,
} from '../utils/turnstiles';

export function DoorsPanel({ turnstileId, deviceIndexCode }: { turnstileId: number; deviceIndexCode?: string | null }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const doors = useQuery(turnstileDoorsQuery(turnstileId));
  const create = useCreateDoor();
  const setDirection = useSetDoorDirection();
  const remove = useDeleteDoor();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<DoorForm>(EMPTY_DOOR);
  const [error, setError] = useState<string | null>(null);

  const dirOptions = [
    { value: 'entrance' as const, label: t('turnstiles.dirEntrance') },
    { value: 'exit' as const, label: t('turnstiles.dirExit') },
  ];
  const doorName = (d: TurnstileDoor) => d.door_name || t('turnstiles.doorFallbackName', { no: d.door_no || d.id });

  const changeDirection = async (d: TurnstileDoor, direction: Direction) => {
    if (direction === doorDirection(d) && d.direction_type) return;
    const label = direction === 'exit' ? t('turnstiles.dirExit') : t('turnstiles.dirEntrance');
    const ok = await confirm({
      title: t('turnstiles.doorFieldDirection'),
      message: `${doorName(d)} → ${label}`,
      confirmLabel: label,
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      await setDirection.mutateAsync({ id: d.id, direction });
      toast.success(t('turnstiles.doorDirectionSaved'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('turnstiles.actionFailed')));
    }
  };

  const del = async (d: TurnstileDoor) => {
    const ok = await confirm({
      title: t('turnstiles.doorRemoveTitle'),
      message: t('turnstiles.doorRemoveConfirm', { name: d.door_name || d.door_index_code || '' }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(d.id);
      toast.success(t('turnstiles.deleted'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('turnstiles.actionFailed')));
    }
  };

  const submit = async () => {
    const r = buildDoorBody(form, turnstileId, deviceIndexCode);
    if (!r.ok) return setError(t(r.error));
    try {
      await create.mutateAsync(r.body);
      toast.success(t('turnstiles.saved'));
      setForm(EMPTY_DOOR);
      setAdding(false);
    } catch (e) {
      setError(getApiErrorMessage(e, t('turnstiles.actionFailed')));
    }
  };

  const renderDoors = () => {
    if (doors.isError && !doors.data) return <ErrorState onRetry={() => doors.refetch()} />;
    if (doors.isPending) return <Skeleton height={120} />;
    if (!doors.data.length) {
      return <EmptyState title={t('turnstiles.doorsEmpty')} message={t('turnstiles.doorsEmptyHint')} />;
    }
    return doors.data.map((d) => (
      <View key={d.id} style={[styles.door, { borderColor: c.border, backgroundColor: c.surface2 }]}>
        <View style={styles.doorHead}>
          <View style={styles.flex}>
            <Text variant="heading" numberOfLines={1}>
              {doorName(d)}
            </Text>
            <Text variant="caption" tone="subtle" numberOfLines={1}>
              {t('turnstiles.doorCodeLine', { no: d.door_no || '—', code: d.door_index_code || '—' })}
            </Text>
          </View>
          <IconButton
            icon="trash"
            testID={`door-delete-${d.id}`}
            accessibilityLabel={t('common.delete')}
            onPress={() => void del(d)}
          />
        </View>
        <Segmented
          testID={`door-direction-${d.id}`}
          value={doorDirection(d)}
          onChange={(v) => void changeDirection(d, v)}
          options={dirOptions}
        />
        {!d.direction_type && (
          <Text variant="caption" tone="danger" testID={`door-unset-${d.id}`}>
            {t('turnstiles.doorDirectionUnset')}
          </Text>
        )}
      </View>
    ));
  };

  return (
    <View style={styles.root}>
      {renderDoors()}
      {adding ? (
        <View style={[styles.door, { borderColor: c.border }]}>
          <FormInput
            testID="door-form-code"
            label={t('turnstiles.doorFieldCode')}
            value={form.code}
            onChangeText={(v) => {
              setForm((f) => ({ ...f, code: v }));
              setError(null);
            }}
            required
          />
          <Text variant="caption" tone="subtle" style={styles.hint}>
            {t('turnstiles.doorCodeHint')}
          </Text>
          <FormInput
            testID="door-form-no"
            label={t('turnstiles.doorFieldNo')}
            value={form.no}
            onChangeText={(v) => setForm((f) => ({ ...f, no: v }))}
          />
          <FormInput
            testID="door-form-name"
            label={t('turnstiles.doorFieldName')}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          />
          <Text variant="label" tone="muted">
            {t('turnstiles.doorFieldDirection')}
          </Text>
          <Segmented
            testID="door-form-direction"
            value={form.direction}
            onChange={(v) => setForm((f) => ({ ...f, direction: v }))}
            options={dirOptions}
          />
          {!!error && (
            <Text variant="label" tone="danger" testID="door-form-error">
              {error}
            </Text>
          )}
          <View style={styles.actions}>
            <Button
              label={t('common.cancel')}
              variant="ghost"
              onPress={() => {
                setAdding(false);
                setError(null);
              }}
            />
            <Button
              testID="door-form-save"
              label={t('common.save')}
              onPress={() => void submit()}
              loading={create.isPending}
            />
          </View>
        </View>
      ) : (
        <Button
          testID="door-add"
          label={t('turnstiles.doorAdd')}
          icon="plus"
          variant="soft"
          onPress={() => setAdding(true)}
          full
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  door: { gap: 8, borderWidth: 1.5, borderRadius: radii.md, padding: 12 },
  doorHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  hint: { marginTop: -12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
