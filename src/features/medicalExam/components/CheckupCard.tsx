// One checkup record: date, specialty, doctor, conclusion, recommendation, diagnoses, fitness.
// Shared by the employee's results and the doctor's card history.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Badge, Button, Text } from '@/ui';
import { fitnessTone, fmtDate, type ExamCheckup } from '../utils/medicalExam';

export function CheckupCard({ checkup: c, onEdit }: { checkup: ExamCheckup; onEdit?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface2 }]} testID={`checkup-${c.id}`}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text variant="heading">{c.specialty_name || t('medicalExam.results.noSpecialty')}</Text>
          <Text variant="caption" tone="muted">
            {[fmtDate(c.checkup_date), c.doctor_name, c.doctor_is_external ? c.doctor_workplace : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {!!c.fitness && <Badge label={t(`medicalExam.fitness.${c.fitness}`)} tone={fitnessTone(c.fitness)} />}
      </View>
      {!!c.conclusion && <Field label={t('medicalExam.record.conclusion')} value={c.conclusion} />}
      {!!c.recommendation && <Field label={t('medicalExam.record.recommendation')} value={c.recommendation} />}
      {!!c.diagnoses?.length && (
        <View style={styles.field}>
          <Text variant="caption" tone="muted">
            {t('medicalExam.record.diagnoses')}
          </Text>
          {c.diagnoses.map((d, i) => (
            <Text key={`${d.code ?? ''}-${i}`} variant="body">
              {d.code ? `${d.code} — ${d.name}` : d.name}
            </Text>
          ))}
        </View>
      )}
      {c.locked && (
        <Text variant="caption" tone="muted">
          {t('medicalExam.record.locked')}
        </Text>
      )}
      {!!onEdit && c.can_edit && (
        <Button label={t('common.edit')} variant="soft" size="sm" onPress={onEdit} testID={`checkup-${c.id}-edit`} />
      )}
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.md, padding: 12, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flex: { flex: 1 },
  field: { gap: 2 },
});
