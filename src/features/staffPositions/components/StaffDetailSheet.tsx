// Shtat qatori tafsiloti: birliklar, vakansiya e'loni (talablar, maosh, muddat,
// aloqa) va o'zgarishlar tarixi. Yozish (tahrir, yopish/qayta ochish) — faqat
// `canManageStaff` va haqiqiy qator (`id`) bo'lsa; virtual qatorga shtat avval
// yaratilishi kerak.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fmtUnits } from '@/utils/units';
import { Badge, Button, Sheet, Text, type Tone } from '@/ui';
import { staffChangesQuery, type StaffPosition } from '../api/queries';
import { isPastDeadline } from '../utils/staff';

export function stateBadge(r: StaffPosition): { key: string; tone: Tone } {
  if (!r.has_staff_row) return { key: 'staff.noStaffRow', tone: 'warning' };
  if (r.is_closed) return { key: 'staff.closedState', tone: 'neutral' };
  return { key: 'staff.openState', tone: 'success' };
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'success' }) {
  return (
    <View style={styles.kv}>
      <Text variant="caption" tone="subtle" style={styles.kvLabel}>
        {label}
      </Text>
      <Text variant="body" tone={tone} style={styles.kvValue}>
        {value}
      </Text>
    </View>
  );
}

export function StaffDetailSheet({
  row,
  canWrite,
  onClose,
  onEdit,
  onToggle,
  toggling,
}: {
  row: StaffPosition;
  canWrite: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
  toggling: boolean;
}) {
  const { t } = useTranslation();
  const changes = useQuery(staffChangesQuery(row.id));
  const today = dayjs().format('YYYY-MM-DD');
  const vacant = Number(row.vacant_units ?? 0);
  const st = stateBadge(row);
  const fmt = (d?: string | null) => (d ? dayjs(d).format('DD.MM.YYYY') : '—');
  const salary = [row.salary_from, row.salary_to].filter((v) => v != null && v !== '').join(' – ');
  const contact = [row.contact_person, row.contact_phone, row.contact_email].filter(Boolean).join(' · ');

  return (
    <Sheet scroll visible onClose={onClose} title={`${row.department_name ?? '—'} · ${row.job_position_name ?? '—'}`}>
      <View style={styles.body}>
        <View style={styles.badges}>
          <Badge label={t(st.key)} tone={st.tone} />
          {!!row.category && (
            <Badge label={t(`staff.cat_${row.category}`, { defaultValue: row.category })} tone="brand" />
          )}
        </View>
        <Row label={t('staff.planned')} value={fmtUnits(row.planned_units)} />
        <Row label={t('staff.occupied')} value={fmtUnits(row.occupied_units)} />
        <Row
          label={t('staff.vacant')}
          value={vacant < 0 ? `${fmtUnits(row.vacant_units)} · ${t('staff.overstaffed')}` : fmtUnits(row.vacant_units)}
          tone={vacant < 0 ? 'danger' : vacant > 0 ? 'success' : undefined}
        />
        {!!row.vacancy_open_date && <Row label={t('staff.vacantSince')} value={fmt(row.vacancy_open_date)} />}
        {!!row.candidate_requirements && <Row label={t('staff.requirements')} value={row.candidate_requirements} />}
        {!!salary && <Row label={t('staff.salary')} value={salary} />}
        {!!row.application_deadline && (
          <Row
            label={t('staff.deadline')}
            value={fmt(row.application_deadline)}
            tone={isPastDeadline(row.application_deadline, today) ? 'danger' : undefined}
          />
        )}
        {!!contact && <Row label={t('staff.contactPerson')} value={contact} />}
        {!!row.note && <Row label={t('staff.note')} value={row.note} />}
        {!row.id && (
          <Text variant="caption" tone="muted">
            {t('staff.virtualHint')}
          </Text>
        )}

        {(changes.data ?? []).length > 0 && (
          <View style={styles.history}>
            <Text variant="label">{t('staff.history')}</Text>
            {changes.data!.map((c) => (
              <View key={c.id} style={styles.change}>
                <Text variant="caption">
                  {`${fmt(c.created_at)} · ${t(`staff.action_${c.action}`, { defaultValue: c.action })}`}
                  {c.new_planned_units != null
                    ? ` · ${fmtUnits(c.old_planned_units)} → ${fmtUnits(c.new_planned_units)}`
                    : ''}
                </Text>
                {(!!c.reason || !!c.changed_by_name) && (
                  <Text variant="caption" tone="subtle">
                    {[c.reason, c.changed_by_name].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {canWrite && row.id != null && (
          <View style={styles.actions}>
            <Button testID="staff-edit" label={t('staff.editRow')} variant="soft" full onPress={onEdit} />
            <Button
              testID="staff-close"
              label={row.is_closed ? t('staff.reopen') : t('staff.close')}
              variant="ghost"
              full
              loading={toggling}
              onPress={onToggle}
            />
          </View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 8 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  kv: { flexDirection: 'row', gap: 12 },
  kvLabel: { width: '40%' },
  kvValue: { flex: 1 },
  history: { gap: 6, marginTop: 6 },
  change: { gap: 2 },
  actions: { gap: 8, marginTop: 6 },
});
