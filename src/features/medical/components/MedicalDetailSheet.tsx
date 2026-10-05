// Xodimning tibbiy kartasi (v2 `EmployeeCard`): ko'riklar tarixi (barcha doktorlar
// yozuvi) + yillik indekslar. Har tugma serverning bayrog'idan — tafsilotning
// `can_add_checkup` / `can_set_annual_index` va yozuvning `can_edit` / `can_delete`;
// mobil o'zi taxmin qilmaydi. Formalar shu varaq ichida. Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { Badge, Button, ErrorState, IconButton, Sheet, Skeleton, Text } from '@/ui';
import { medicalDetailQuery } from '../api/queries';
import { useRemoveCheckup } from '../api/mutations';
import {
  fmtDate,
  indexTone,
  rowSubtitle,
  sortCheckups,
  statusTone,
  type Checkup,
  type MedicalRow,
} from '../utils/medical';
import { AnnualIndexForm } from './AnnualIndexForm';
import { CheckupFiles } from './CheckupFiles';
import { CheckupForm } from './CheckupForm';

type Mode = null | 'index' | { checkup: Checkup | null };

export function MedicalDetailSheet({ row, onClose }: { row: MedicalRow; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useQuery(medicalDetailQuery(row.id));
  const remove = useRemoveCheckup();
  const [mode, setMode] = useState<Mode>(null);
  const d = q.data;
  // Karta javobidagi qator yangiroq (ko'rik qo'shilgach holat o'zgaradi) — bo'lmasa ro'yxatdagisi.
  const emp = d?.employee ?? row;
  const checkups = sortCheckups(d?.checkups);

  const doRemove = async (c: Checkup) => {
    const ok = await confirm({
      title: t('medical.deleteCheckupTitle'),
      message: t('medical.deleteCheckupConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(c.id);
      toast.success(t('medical.deleted'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const header = (
    <View style={styles.block}>
      {!!rowSubtitle(emp) && (
        <Text variant="caption" tone="subtle">
          {[emp.branch_name, rowSubtitle(emp)].filter(Boolean).join(' · ')}
        </Text>
      )}
      <View style={styles.row}>
        {!!emp.status && (
          <Badge
            testID="medical-detail-status"
            label={t(`medical.status_${emp.status}`, { defaultValue: emp.status })}
            tone={statusTone(emp.status)}
          />
        )}
        {!!emp.annual_index && (
          <Badge
            label={`${t(`medical.index_${emp.annual_index}`, { defaultValue: emp.annual_index })}${
              emp.annual_index_year ? ` · ${emp.annual_index_year}` : ''
            }`}
            tone={indexTone(emp.annual_index)}
          />
        )}
      </View>
      <Text variant="caption" tone="muted">
        {`${t('medical.colLast')}: ${fmtDate(emp.last_checkup_date)} · ${t('medical.colCount')}: ${
          emp.checkup_count ?? 0
        }`}
      </Text>
    </View>
  );

  const body = () => {
    if (!d) return null;
    if (mode === 'index') return <AnnualIndexForm employeeId={row.id} onDone={() => setMode(null)} />;
    if (mode) return <CheckupForm employeeId={row.id} checkup={mode.checkup} onDone={() => setMode(null)} />;
    return (
      <>
        {(d.can_add_checkup || d.can_set_annual_index) && (
          <View style={styles.actions}>
            {d.can_add_checkup && (
              <Button
                testID="medical-add-checkup"
                label={t('medical.addCheckup')}
                icon="plus"
                size="sm"
                onPress={() => setMode({ checkup: null })}
              />
            )}
            {d.can_set_annual_index && (
              <Button
                testID="medical-set-index"
                label={t('medical.setIndex')}
                variant="soft"
                size="sm"
                onPress={() => setMode('index')}
              />
            )}
          </View>
        )}

        <View style={styles.block}>
          <Text variant="label">{t('medical.history')}</Text>
          {checkups.length === 0 ? (
            <Text variant="caption" tone="muted">
              {t('medical.noCheckups')}
            </Text>
          ) : (
            checkups.map((c) => (
              <View key={c.id} style={styles.checkup} testID={`medical-checkup-${c.id}`}>
                <View style={styles.row}>
                  <Text variant="heading" style={styles.date}>
                    {fmtDate(c.checkup_date)}
                  </Text>
                  {!!c.specialty_name && <Badge label={c.specialty_name} />}
                  <View style={styles.spacer} />
                  {c.can_edit && (
                    <IconButton
                      testID={`medical-checkup-edit-${c.id}`}
                      icon="edit"
                      accessibilityLabel={t('common.edit')}
                      onPress={() => setMode({ checkup: c })}
                    />
                  )}
                  {c.can_delete && (
                    <IconButton
                      testID={`medical-checkup-remove-${c.id}`}
                      icon="trash"
                      accessibilityLabel={t('common.delete')}
                      onPress={() => void doRemove(c)}
                    />
                  )}
                </View>
                {!!c.doctor_name && (
                  <Text variant="caption" tone="subtle">
                    {c.doctor_name}
                  </Text>
                )}
                {!!c.conclusion && <Text variant="body">{c.conclusion}</Text>}
                {!!c.recommendation && (
                  <Text variant="caption" tone="muted">
                    {`${t('medical.recommendation')}: ${c.recommendation}`}
                  </Text>
                )}
                <CheckupFiles checkup={c} isDoctor={!!d.can_add_checkup} />
              </View>
            ))
          )}
        </View>

        {(d.annual_indexes?.length ?? 0) > 0 && (
          <View style={styles.block}>
            <Text variant="label">{t('medical.annualIndexes')}</Text>
            {d.annual_indexes.map((a, i) => (
              <View key={a.id ?? i} style={styles.index}>
                <View style={styles.row}>
                  <Text variant="heading">{a.year != null ? String(a.year) : '—'}</Text>
                  {!!a.health_index && (
                    <Badge
                      label={t(`medical.index_${a.health_index}`, { defaultValue: a.health_index })}
                      tone={indexTone(a.health_index)}
                    />
                  )}
                  {!!a.set_at && (
                    <Text variant="caption" tone="subtle" style={styles.setAt}>
                      {dayjs(a.set_at).format('DD.MM.YYYY HH:mm')}
                    </Text>
                  )}
                </View>
                {!!a.index_note && (
                  <Text variant="caption" tone="muted">
                    {a.index_note}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </>
    );
  };

  return (
    <Sheet visible onClose={onClose} title={row.legal_name || t('medical.card')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {header}
        {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !d ? <Skeleton height={180} /> : body()}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 14, paddingBottom: 8 },
  block: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkup: { gap: 4, paddingVertical: 8 },
  date: { fontSize: 15 },
  spacer: { flex: 1 },
  index: { gap: 2, paddingVertical: 4 },
  setAt: { marginLeft: 'auto' },
});
