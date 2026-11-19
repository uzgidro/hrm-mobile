// «Belgilash» sheet (web v2 `AssignModal`): HR designates rest-day work for many employees × days at
// once, usually by an order. Employees come from the grid with `include_all` (the same branch scope the
// server applies), the order can be picked from the month's approved overtime orders.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { SelectedChips } from '@/components/SelectedChips';
import { Button, Chip, SelectField, Sheet, Text } from '@/ui';
import { useAssignWork } from '../api/mutations';
import { weekendGridQuery } from '../api/queries';
import type { GridParams, WeekendDay, WeekendOrder } from '../types';
import { assignBody, fmtDate, parseHours, restDates } from '../utils/weekend';

export function AssignSheet({
  params,
  days,
  orders,
  onClose,
}: {
  params: GridParams;
  days: WeekendDay[];
  orders: WeekendOrder[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const assign = useAssignWork();
  // Every employee of the branch (not only those who worked a rest day).
  const all = useQuery(weekendGridQuery({ ...params, search: undefined, departmentId: undefined, includeAll: true }));
  const people = useMemo(() => all.data?.rows ?? [], [all.data]);
  const [ids, setIds] = useState<number[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [hours, setHours] = useState('8');
  const [orderRef, setOrderRef] = useState('');
  const [orderActId, setOrderActId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pickPeople, setPickPeople] = useState(false);
  const [pickOrder, setPickOrder] = useState(false);

  const departments = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const r of people) {
      const k = r.department || t('weekendTabel.noDepartment');
      m.set(k, [...(m.get(k) ?? []), r.employee_id]);
    }
    return [...m.entries()];
  }, [people, t]);

  const toggleId = (id: number) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const toggleDate = (d: string) =>
    setDates((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  const addDepartment = (list: number[]) => setIds((cur) => [...new Set([...cur, ...list])]);

  const chosen = people.filter((p) => ids.includes(p.employee_id));
  const nameOf = (id: number) => people.find((p) => p.employee_id === id)?.name ?? `#${id}`;

  const pickFromOrder = (orderId: number) => {
    const o = orders.find((x) => x.order_act_id === orderId);
    setPickOrder(false);
    if (!o) return;
    setIds((cur) => (cur.includes(o.employee_id) ? cur : [...cur, o.employee_id]));
    setDates((cur) => [...new Set([...cur, ...o.rest_days])].sort());
    setOrderRef(o.ref);
    setOrderActId(o.order_act_id);
    setError(null);
  };

  const run = async (value: number | null) => {
    try {
      const r = await assign.mutateAsync(
        assignBody({ employeeIds: ids, dates, hours: value, orderRef, orderActId, note }),
      );
      toast.success(t(value === null ? 'weekendTabel.assignRemoved' : 'weekendTabel.assignDone', { count: r.changed }));
      if (r.not_rest_days.length > 0) {
        toast.error(t('weekendTabel.assignNotRest', { days: r.not_rest_days.map(fmtDate).join(', ') }));
      }
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const needSelection = () => {
    if (ids.length === 0 || dates.length === 0) {
      setError(t('weekendTabel.assignNeedSelection'));
      return true;
    }
    return false;
  };

  const submit = () => {
    setError(null);
    if (needSelection()) return;
    const n = parseHours(hours);
    if (n === null) {
      setError(t('weekendTabel.hoursInvalid'));
      return;
    }
    void run(n);
  };

  const remove = async () => {
    setError(null);
    if (needSelection()) return;
    const ok = await confirm({
      title: t('weekendTabel.assignRemove'),
      message: t('weekendTabel.assignRemoveConfirm', { employees: ids.length, days: dates.length }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) void run(null);
  };

  const eligible = orders.filter((o) => o.rest_days.length > 0);
  return (
    <Sheet visible onClose={onClose} title={t('weekendTabel.assignTitle')} scroll>
      <View style={styles.body} testID="weekend-assign-sheet">
        {eligible.length > 0 && (
          <View style={styles.block}>
            <SelectField
              testID="weekend-assign-order-pick"
              label={t('weekendTabel.assignFromOrder')}
              value={orderActId ? orderRef : null}
              placeholder={t('weekendTabel.assignFromOrderHint')}
              onPress={() => setPickOrder(true)}
            />
          </View>
        )}

        <View style={styles.block}>
          <SelectField
            testID="weekend-assign-people"
            label={t('weekendTabel.assignEmployees')}
            value={ids.length ? t('weekendTabel.assignSelected', { count: ids.length }) : null}
            placeholder={t('weekendTabel.assignPickEmployees')}
            onPress={() => setPickPeople(true)}
          />
          <SelectedChips items={chosen.map((p) => ({ value: p.employee_id, label: p.name }))} onRemove={toggleId} />
          {ids.filter((id) => !chosen.some((p) => p.employee_id === id)).map((id) => (
            <Text key={id} variant="caption" tone="muted">
              {nameOf(id)}
            </Text>
          ))}
          {departments.length > 1 && (
            <View style={styles.chips}>
              <Text variant="caption" tone="subtle">
                {t('weekendTabel.assignPickDepartment')}:
              </Text>
              {departments.map(([name, list]) => (
                <Chip key={name} label={`${name} · ${list.length}`} onPress={() => addDepartment(list)} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.block}>
          <Text variant="label" tone="muted">
            {t('weekendTabel.assignDays')}
          </Text>
          <View style={styles.chips}>
            {days.map((d) => (
              <Chip
                key={d.date}
                testID={`weekend-day-${d.date}`}
                label={`${d.day} ${t(`weekendTabel.wd${d.weekday}`)}`}
                selected={dates.includes(d.date)}
                tone={d.rest === 'holiday' ? 'danger' : d.rest ? 'warning' : 'neutral'}
                onPress={() => toggleDate(d.date)}
              />
            ))}
          </View>
          <View style={styles.chips}>
            <Button
              testID="weekend-all-rest"
              size="sm"
              variant="soft"
              label={t('weekendTabel.assignAllRest')}
              onPress={() => setDates(restDates(days))}
            />
            {dates.length > 0 && (
              <Button size="sm" variant="ghost" label={t('weekendTabel.assignClearDays')} onPress={() => setDates([])} />
            )}
          </View>
        </View>

        <FormInput
          label={t('weekendTabel.hoursLabel')}
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
          testID="weekend-assign-hours"
        />
        <FormInput
          label={t('weekendTabel.assignOrderRef')}
          value={orderRef}
          onChangeText={(v) => {
            setOrderRef(v);
            // A hand-edited reference no longer belongs to the picked order.
            setOrderActId(null);
          }}
          placeholder={t('weekendTabel.assignOrderRefPlaceholder')}
          testID="weekend-assign-ref"
        />
        <FormInput label={t('weekendTabel.noteLabel')} value={note} onChangeText={setNote} testID="weekend-assign-note" />
        {!!error && (
          <Text variant="caption" tone="danger" testID="weekend-assign-error">
            {error}
          </Text>
        )}
        <Button
          testID="weekend-assign-submit"
          label={t('weekendTabel.assign')}
          icon="check"
          loading={assign.isPending}
          onPress={submit}
          full
        />
        <Button
          testID="weekend-assign-remove"
          label={t('weekendTabel.assignRemove')}
          variant="dangerGhost"
          disabled={assign.isPending}
          onPress={() => void remove()}
          full
        />
      </View>

      <PickerModal
        visible={pickPeople}
        title={t('weekendTabel.assignEmployees')}
        options={people.map((p) => ({ value: p.employee_id, label: p.name, subLabel: p.department ?? undefined }))}
        loading={all.isPending}
        multiple
        selected={ids}
        onClose={() => setPickPeople(false)}
        onSelect={toggleId}
        onToggle={toggleId}
      />
      <PickerModal
        visible={pickOrder}
        title={t('weekendTabel.assignFromOrder')}
        options={eligible.map((o) => ({
          value: o.order_act_id,
          label: `${o.ref} · ${o.employee_name}`,
          subLabel: o.rest_days.map(fmtDate).join(', '),
        }))}
        avatars={false}
        selected={orderActId}
        onClose={() => setPickOrder(false)}
        onSelect={pickFromOrder}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  block: { gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
});
