// Edit sheet for one rest-day cell (web v2 `CellEditor`): hours, note, save, and «back to turnstile».
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { FormInput } from '@/components/FormInput';
import { Badge, Button, Chip, Sheet, Text } from '@/ui';
import { useSaveEntry } from '../api/mutations';
import type { WeekendDay, WeekendRow } from '../types';
import { entryBody, fmtDate, hasOverride, parseHours, sourceTone } from '../utils/weekend';

export function CellSheet({
  row,
  date: initialDate,
  days,
  pickDate,
  onClose,
}: {
  row: WeekendRow;
  date: string;
  days: WeekendDay[];
  /** Offer the month's rest days as a date choice (the «add a day» entry point). */
  pickDate: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const save = useSaveEntry();
  const [date, setDate] = useState(initialDate);
  const cell = row.cells[date] ?? null;
  const zero = row.manual_zero.includes(date);
  const [hours, setHours] = useState(cell ? String(cell.hours) : '');
  const [note, setNote] = useState('');
  const [invalid, setInvalid] = useState(false);

  const choose = (d: string) => {
    const next = row.cells[d];
    setDate(d);
    setHours(next ? String(next.hours) : '');
    setNote('');
    setInvalid(false);
  };

  const submit = async (value: number | null) => {
    try {
      await save.mutateAsync(entryBody(row.employee_id, date, value, note));
      toast.success(t('weekendTabel.saved'));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  const onSave = () => {
    const n = parseHours(hours);
    if (n === null) {
      setInvalid(true);
      return;
    }
    void submit(n);
  };

  const restDays = days.filter((d) => d.rest);
  return (
    <Sheet visible onClose={onClose} title={t('weekendTabel.cellTitle')} scroll>
      <View style={styles.body} testID="weekend-cell-sheet">
        <View>
          <Text variant="heading">{row.name}</Text>
          <Text variant="caption" tone="subtle" testID="weekend-cell-date">
            {fmtDate(date)}
          </Text>
        </View>
        {pickDate && (
          <View style={styles.chips}>
            {restDays.map((d) => (
              <Chip
                key={d.date}
                testID={`weekend-pick-${d.date}`}
                label={`${d.day} ${t(`weekendTabel.wd${d.weekday}`)}`}
                selected={d.date === date}
                tone={d.rest === 'holiday' ? 'danger' : 'warning'}
                onPress={() => choose(d.date)}
              />
            ))}
          </View>
        )}
        {cell && (
          <View style={styles.source}>
            <Text variant="caption" tone="muted">
              {t('weekendTabel.sourceLabel')}:
            </Text>
            <Badge label={t(`weekendTabel.src${cell.source[0]!.toUpperCase()}${cell.source.slice(1)}`)} tone={sourceTone(cell.source)} />
            {cell.source === 'order' && !!cell.ref && (
              <Text variant="caption" tone="brand" testID="weekend-cell-ref">
                {cell.ref}
              </Text>
            )}
          </View>
        )}
        {zero && (
          <Text variant="caption" tone="muted">
            {t('weekendTabel.zeroNote')}
          </Text>
        )}
        <View>
          <FormInput
            label={t('weekendTabel.hoursLabel')}
            value={hours}
            onChangeText={(v) => {
              setHours(v);
              setInvalid(false);
            }}
            keyboardType="decimal-pad"
            error={invalid ? t('weekendTabel.hoursInvalid') : undefined}
            testID="weekend-hours"
          />
          {!invalid && (
            <Text variant="caption" tone="subtle" style={{ color: c.fgSubtle }}>
              {t('weekendTabel.hoursHint')}
            </Text>
          )}
        </View>
        <FormInput label={t('weekendTabel.noteLabel')} value={note} onChangeText={setNote} testID="weekend-note" />
        <Button testID="weekend-save" label={t('common.save')} icon="check" loading={save.isPending} onPress={onSave} full />
        {hasOverride(cell, zero) && (
          <Button
            testID="weekend-revert"
            label={t('weekendTabel.revert')}
            variant="soft"
            disabled={save.isPending}
            onPress={() => void submit(null)}
            full
          />
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
