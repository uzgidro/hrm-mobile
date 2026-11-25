// «Qaysi shifokor ko'radi?»: the doctor, a visit time for everybody who needs one, the nurse.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text } from '@/ui';
import { ChoiceField, SwitchRow } from '../../components/forms';
import { ChoiceCard, MoreBlock, Note } from '../components/parts';
import { SlotPicker } from '../components/SlotPicker';
import type { ArrivalOptions } from '../types';
import { plusDays, type Derived, type WizState } from './state';
import type { StepSet } from './StepWho';

const FIRST = 4;

export function StepDoctor({ s, set, o, d }: { s: WizState; set: StepSet; o?: ArrivalOptions; d: Derived }) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const existing = !!o?.has_exam;
  const doctors = o?.doctors ?? [];
  const list = all ? doctors : doctors.slice(0, FIRST);
  const shown = d.doctor && !list.includes(d.doctor) ? [d.doctor, ...list.slice(0, FIRST - 1)] : list;
  const many = s.members.length > 1;
  const setExam = (key: string, at: string | undefined) => set({ examAt: { ...s.examAt, [key]: at } });
  return (
    <View style={styles.stack}>
      {existing && <Note tone="success" testID="exam-already">{t('sanFlow.doctor.already')}</Note>}
      {d.doctorNeeded && doctors.length === 0 && <Note tone="warning" testID="doctor-empty">{t('sanFlow.doctor.none')}</Note>}
      <View style={styles.stack} accessibilityRole="radiogroup">
        {shown.map((doc) => (
          <ChoiceCard
            key={doc.staff_id} on={d.doctorNeeded && d.doctor?.staff_id === doc.staff_id} icon="user" title={doc.full_name} testID={`doctor-${doc.staff_id}`}
            badges={o?.suggested_doctor_id === doc.staff_id ? [{ label: t('sanFlow.room.suggested'), tone: 'success' }] : []}
            hint={[doc.specialty, doc.cabinet && !doc.place ? t('sanFlow.doctor.cabinet', { n: doc.cabinet }) : null, t('sanFlow.doctor.load', { n: doc.load ?? 0 })].filter(Boolean).join(' · ')}
            extra={doc.place ?? null}
            onPress={() => set({ wantDoctor: true, doctorId: doc.staff_id, examAt: {} })}
          />
        ))}
        <ChoiceCard on={!d.doctorNeeded} icon="close" title={t('sanFlow.doctor.notNeeded')} hint={t('sanFlow.doctor.notNeededHint')} testID="doctor-none" onPress={() => set({ wantDoctor: false, examAt: {} })} />
      </View>
      {!all && doctors.length > FIRST && <Button label={t('sanFlow.doctor.showAll', { n: doctors.length })} variant="ghost" onPress={() => setAll(true)} testID="doctor-all" />}

      {!!d.doctor && !existing && (
        <View style={styles.stack} testID="exam-times">
          <Text variant="heading">{t('sanFlow.doctor.when')}</Text>
          {s.members.map((m, i) => {
            const at = d.exams[m.key] ?? '';
            const on = s.examAt[m.key] !== '' && (!!at || s.examAt[m.key] !== undefined || !many);
            return (
              <View key={m.key}>
                {many && (
                  <SwitchRow
                    label={m.full_name || t('sanFlow.who.guest')} value={!!at} testID={`exam-on-${i}`}
                    onChange={(v) => setExam(m.key, v ? d.doctor!.next_slots.find((x) => !Object.values(d.exams).includes(x)) ?? undefined : '')}
                  />
                )}
                {(many ? !!at : on) && (
                  <SlotPicker
                    staffId={d.doctor!.staff_id} slots={d.doctor!.next_slots} value={at} min={s.start} max={plusDays(s.end, -1)} minutes={o?.exam_slot_min ?? 20} testID={`slots-${i}`}
                    taken={Object.entries(d.exams).filter(([k]) => k !== m.key).map(([, v]) => v)} onChange={(v) => setExam(m.key, v)}
                  />
                )}
              </View>
            );
          })}
          {!many && <SwitchRow label={t('sanFlow.doctor.timeLater')} value={s.examAt[s.members[0]!.key] === ''} onChange={(v) => setExam(s.members[0]!.key, v ? '' : undefined)} testID="time-later" />}
        </View>
      )}

      {d.doctorNeeded && (o?.nurses.length ?? 0) > 0 && (
        <MoreBlock title={t('sanFlow.common.more')} testID="doctor-more">
          <ChoiceField
            label={t('sanFlow.doctor.nurse')} value={d.nurseId || null} noneLabel={t('sanFlow.doctor.notAssigned')} testID="wiz-nurse"
            options={(o?.nurses ?? []).map((x) => ({ value: String(x.staff_id), label: x.full_name, sub: t('sanFlow.doctor.load', { n: x.load ?? 0 }) }))} onChange={(v) => set({ nurseId: v ?? '' })}
          />
          <Text variant="caption" tone="muted">{t('sanFlow.doctor.nurseHint')}</Text>
        </MoreBlock>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 10 } });
