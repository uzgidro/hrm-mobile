// «Yoqilg'i turlari» tabi (v2 FuelTab): narx kitobi — narx tasdiqlovchi imzolagachgina hisobga
// kiradi. Qo'shish/tahrir/o'chirish — `can_manage`; narxni tasdiqlash/rad — `can_approve`.
// Narx tarixi — kim, qachon, qanday o'zgartirgani (varaq ochilganda yuklanadi).
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { useTheme } from '@/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  SearchField,
  Segmented,
  Sheet,
  Skeleton,
  Text,
} from '@/ui';
import { fuelLogsQuery, fuelTypesQuery } from '../api/queries';
import { useApproveFuelType, useRemoveFuelType, useSaveFuelType } from '../api/mutations';
import {
  buildFuelBody,
  filterFuel,
  fmtDateTime,
  fmtMoney,
  fuelBadge,
  fuelDecisionBody,
  FUEL_UNITS,
  isFuelApproved,
  pendingFuelCount,
  type FuelFilter,
  type FuelType,
} from '../utils/vehicles';

type Open =
  | null
  | { kind: 'form'; fuel: FuelType | null; n: number }
  | { kind: 'decide'; fuel: FuelType; n: number }
  | { kind: 'history'; n: number };

export function FuelTab({ canManage, canApprove }: { canManage: boolean; canApprove: boolean }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const list = useQuery(fuelTypesQuery());
  const remove = useRemoveFuelType();
  const [search, setSearch] = useState('');
  const [only, setOnly] = useState<FuelFilter>('');
  const [open, setOpen] = useState<Open>(null);
  const all = list.data ?? [];
  const rows = filterFuel(all, search, only);
  const pending = pendingFuelCount(all);

  const del = async (f: FuelType) => {
    const ok = await confirm({
      title: t('common.delete'),
      message: f.name ?? '',
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(f.id);
      toast.success(t('vehicles.removed'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.wrap}>
      <SearchField value={search} onChangeText={setSearch} placeholder={t('vehicles.fuelSearchPlaceholder')} />
      <Segmented<FuelFilter>
        testID="vehicles-fuel-filter"
        options={[
          { value: '', label: t('vehicles.fuelAll') },
          { value: 'approved', label: t('vehicles.fuelApproved') },
          { value: 'pending', label: t('vehicles.notApproved'), count: pending || undefined },
          { value: 'rejected', label: t('vehicles.priceRejected') },
        ]}
        value={only}
        onChange={setOnly}
      />
      <View style={styles.chips}>
        <Chip
          testID="vehicles-fuel-history"
          label={t('vehicles.fuelHistory')}
          onPress={() => setOpen({ kind: 'history', n: Date.now() })}
        />
        {canManage && (
          <Chip
            testID="vehicles-fuel-add"
            label={`+ ${t('common.add')}`}
            onPress={() => setOpen({ kind: 'form', fuel: null, n: Date.now() })}
          />
        )}
      </View>
      <Card>
        {list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : list.isPending ? (
          <Skeleton height={160} />
        ) : rows.length === 0 ? (
          search.trim() || only ? (
            <EmptyState title={t('common.noMatch')} message={t('common.noMatchHint')} />
          ) : (
            <EmptyState title={t('vehicles.noFuel')} />
          )
        ) : (
          rows.map((f) => {
            const badge = fuelBadge(f);
            return (
              <View key={f.id} testID={`vehicle-fuel-${f.id}`} style={[styles.row, { borderBottomColor: c.border }]}>
                <View style={styles.flex}>
                  <Text variant="body" weight="600">
                    {f.name || '—'}
                  </Text>
                  <Text variant="caption" tone="subtle">
                    {f.price != null
                      ? `${fmtMoney(f.price)} ${t('vehicles.perUnit', { unit: f.unit ?? '' })}`
                      : t('vehicles.noPrice')}
                    {f.approval_status === 'pending' && f.price != null
                      ? ` · ${t('vehicles.pendingPrice', { price: fmtMoney(f.price) })}`
                      : ''}
                  </Text>
                  {!!badge && <Badge label={t(badge.key)} tone={badge.tone} />}
                </View>
                {canApprove && !isFuelApproved(f) && (
                  <Button
                    testID={`vehicle-fuel-approve-${f.id}`}
                    label={t('vehicles.approvePrice')}
                    size="sm"
                    variant="soft"
                    onPress={() => setOpen({ kind: 'decide', fuel: f, n: Date.now() })}
                  />
                )}
                {canManage && (
                  <View style={styles.actions}>
                    <IconButton
                      testID={`vehicle-fuel-edit-${f.id}`}
                      icon="edit"
                      accessibilityLabel={t('common.edit')}
                      onPress={() => setOpen({ kind: 'form', fuel: f, n: Date.now() })}
                    />
                    <IconButton
                      testID={`vehicle-fuel-delete-${f.id}`}
                      icon="trash"
                      accessibilityLabel={t('common.delete')}
                      onPress={() => void del(f)}
                    />
                  </View>
                )}
              </View>
            );
          })
        )}
      </Card>
      {open?.kind === 'form' && <FuelFormSheet key={open.n} fuel={open.fuel} onClose={() => setOpen(null)} />}
      {open?.kind === 'decide' && <FuelDecisionSheet key={open.n} fuel={open.fuel} onClose={() => setOpen(null)} />}
      {open?.kind === 'history' && <FuelHistorySheet key={open.n} onClose={() => setOpen(null)} />}
    </View>
  );
}

/** v2 `FuelModal`: o'lchov birligi tanlanadi (server faqat shularni qabul qiladi), narx tasdiqgacha kuchsiz. */
function FuelFormSheet({ fuel, onClose }: { fuel: FuelType | null; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveFuelType();
  const [name, setName] = useState(fuel?.name ?? '');
  const [unit, setUnit] = useState(fuel?.unit || 'litr');
  const [price, setPrice] = useState(fuel?.price != null ? String(fuel.price) : '');
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const b = buildFuelBody(name, unit, price);
    if (!b.ok) return setError(t(b.error));
    try {
      await save.mutateAsync({ id: fuel?.id, body: b.body });
      toast.success(t('vehicles.saved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <Sheet visible onClose={onClose} title={fuel ? t('common.edit') : t('common.add')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <FormInput
          testID="fuel-form-name"
          label={t('vehicles.fuelName')}
          value={name}
          onChangeText={setName}
          required
        />
        <Text variant="label" tone="muted">
          {t('vehicles.fuelUnit')}
        </Text>
        <View style={styles.chips}>
          {FUEL_UNITS.map((u) => (
            <Chip key={u} testID={`fuel-unit-${u}`} label={u} selected={unit === u} onPress={() => setUnit(u)} />
          ))}
        </View>
        <FormInput
          testID="fuel-form-price"
          label={t('vehicles.fuelPrice')}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />
        <Text variant="caption" tone="subtle">
          {t('vehicles.priceHint')}
        </Text>
        {!!error && (
          <Text variant="label" tone="danger" testID="fuel-form-error">
            {error}
          </Text>
        )}
        <Button
          testID="fuel-form-save"
          label={t('common.save')}
          loading={save.isPending}
          onPress={() => void submit()}
          full
        />
      </ScrollView>
    </Sheet>
  );
}

/** v2 `FuelDecisionModal`: hukm + izoh (rad etishda majburiy) + ixtiyoriy to'g'rilangan narx. */
function FuelDecisionSheet({ fuel, onClose }: { fuel: FuelType; onClose: () => void }) {
  const { t } = useTranslation();
  const approve = useApproveFuelType();
  const [price, setPrice] = useState(fuel.price != null ? String(fuel.price) : '');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const decide = async (approved: boolean) => {
    const b = fuelDecisionBody(approved, price, note);
    if (!b.ok) return setError(t(b.error));
    try {
      await approve.mutateAsync({ id: fuel.id, body: b.body });
      toast.success(approved ? t('vehicles.priceApproved') : t('vehicles.priceRejected'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <Sheet visible onClose={onClose} title={`${t('vehicles.approvePrice')} · ${fuel.name ?? ''}`}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <FormInput
          testID="fuel-decide-price"
          label={t('vehicles.fuelPrice')}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />
        <Text variant="caption" tone="subtle">
          {t('vehicles.approvePriceHint')}
        </Text>
        <FormInput
          testID="fuel-decide-note"
          label={t('vehicles.decisionNote')}
          value={note}
          onChangeText={setNote}
          multiline
        />
        {!!error && (
          <Text variant="label" tone="danger" testID="fuel-decide-error">
            {error}
          </Text>
        )}
        <View style={styles.rowBtns}>
          <View style={styles.flex}>
            <Button
              testID="fuel-decide-reject"
              label={t('vehicles.rejectPrice')}
              variant="danger"
              loading={approve.isPending}
              onPress={() => void decide(false)}
              full
            />
          </View>
          <View style={styles.flex}>
            <Button
              testID="fuel-decide-approve"
              label={t('common.confirm')}
              loading={approve.isPending}
              onPress={() => void decide(true)}
              full
            />
          </View>
        </View>
      </ScrollView>
    </Sheet>
  );
}

function FuelHistorySheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const logs = useQuery(fuelLogsQuery(true));
  const rows = logs.data ?? [];
  // Tarix (≤200) — 30 tadan, «yana ko'rsatish» bilan.
  const [limit, setLimit] = useState(30);
  return (
    <Sheet visible onClose={onClose} title={t('vehicles.fuelHistory')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <Text variant="caption" tone="subtle">
          {t('vehicles.fuelHistoryHint')}
        </Text>
        {logs.isError ? (
          <ErrorState onRetry={() => logs.refetch()} />
        ) : logs.isPending ? (
          <Skeleton height={160} />
        ) : rows.length === 0 ? (
          <EmptyState title={t('vehicles.fuelHistoryEmpty')} />
        ) : (
          rows.slice(0, limit).map((r) => (
            <View key={r.id} style={[styles.log, { borderBottomColor: c.border }]} testID={`fuel-log-${r.id}`}>
              <Text variant="body" weight="600">
                {[r.fuel_name || '—', r.action_label || r.action].filter(Boolean).join(' · ')}
              </Text>
              <Text variant="caption" tone="muted">
                {r.old_price != null && r.new_price != null && r.old_price !== r.new_price
                  ? `${fmtMoney(r.old_price)} → ${fmtMoney(r.new_price)}`
                  : fmtMoney(r.new_price)}
              </Text>
              <Text variant="caption" tone="subtle">
                {[fmtDateTime(r.created_at), r.actor_name].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ))
        )}
        {rows.length > limit && (
          <Button
            testID="fuel-logs-more"
            label={`${t('vehicles.showMore')} (${rows.length - limit})`}
            variant="ghost"
            size="sm"
            onPress={() => setLimit((n) => n + 30)}
          />
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actions: { flexDirection: 'row' },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  scroll: { flexShrink: 1 },
  body: { gap: 12, paddingBottom: 8 },
  rowBtns: { flexDirection: 'row', gap: 8 },
  log: { paddingVertical: 8, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
});
