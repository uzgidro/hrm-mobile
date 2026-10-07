// Yig'ilish ochish / so'rov yuborish (v2 CreateMeetingModal). Sana va vaqt — Toshkent
// vaqti (mintaqasiz satr serverga shu holicha). Bandlik forma to'ldirilayotganda so'raladi
// (debounce bilan); limit to'lgani ANIQ bo'lsa yuborish tugmasi o'chiq. Takrorlash Zoom'ning
// «Recurring meeting» tanlovlari bilan bir xil. Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { DatePickerModal } from '@/components/DatePicker';
import { DateTimePickerModal } from '@/components/DateTimePicker';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, Chip, SelectField, Sheet, Text, Toggle } from '@/ui';
import { zoomAvailabilityQuery } from '../api/queries';
import { useCreateZoomMeeting } from '../api/mutations';
import {
  DUR_HOURS,
  DUR_MINUTES,
  REPEATS,
  buildCreateBody,
  buildRecurrence,
  composeDuration,
  currentVerdict,
  defaultZoomStart,
  expandRecurrence,
  inTashkent,
  initialZoomForm,
  isoWeekday,
  previewDays,
  splitDuration,
  startAtOf,
  submitBlocked,
  validateZoomForm,
  type Repeat,
  type ZoomForm,
  type ZoomMeeting,
} from '../utils/zoom';

const REPEAT_LABEL: Record<Repeat, string> = {
  none: 'zoom.repeatNone',
  daily: 'zoom.repeatDaily',
  weekly: 'zoom.repeatWeekly',
  monthly: 'zoom.repeatMonthly',
};
const UNIT_LABEL: Record<Exclude<Repeat, 'none'>, string> = {
  daily: 'zoom.unitDay',
  weekly: 'zoom.unitWeek',
  monthly: 'zoom.unitMonth',
};

export function ZoomCreateSheet({
  autoApprove,
  onClose,
  onCreated,
}: {
  autoApprove: boolean;
  onClose: () => void;
  onCreated: (m: ZoomMeeting) => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  // Bugun 10:00 (v2) — o'tib ketgan bo'lsa keyingi yarim soat (Toshkent vaqti).
  const [form, setForm] = useState<ZoomForm>(() => {
    const s = defaultZoomStart();
    return initialZoomForm(s.date, s.time);
  });
  const [picker, setPicker] = useState<null | 'date' | 'time' | 'hours' | 'minutes'>(null);
  const [error, setError] = useState<string | null>(null);
  // Mavzu xatosi maydonning o'zida (pastdagi umumiy xato emas) — ko'rinmay qolmasin.
  const [topicError, setTopicError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const topicRef = useRef<TextInput>(null);
  const create = useCreateZoomMeeting();

  const set = (p: Partial<ZoomForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
    if (p.topic !== undefined) setTopicError(null);
  };

  // Bandlik so'rovi ham, yaratish ham AYNAN shu satr bilan — tekshirilgan oraliq bilan
  // yuborilgani hech qachon farq qilmaydi. Debounce: har o'zgarishga so'rov ketmasin.
  const startAt = startAtOf(form);
  const probeStart = useDebouncedValue(startAt, 350);
  const probeMins = useDebouncedValue(form.duration, 350);
  const availability = useQuery(zoomAvailabilityQuery(probeStart, probeMins));
  const verdict = currentVerdict(
    availability.data,
    { start: probeStart, minutes: probeMins },
    { start: startAt, minutes: form.duration },
  );

  const { hours, minutes } = splitDuration(form.duration);
  const recurrence = buildRecurrence(form);
  const startWeekday = form.date ? isoWeekday(form.date) : null;
  const preview = recurrence && startAt ? expandRecurrence(startAt, recurrence) : [];

  const toggleWeekday = (d: number) =>
    set({ weekdays: form.weekdays.includes(d) ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d] });

  /** Bir bosishda forma eng yaqin bo'sh paytga ko'chadi (v2). */
  const jumpToFree = (iso: string) => {
    const slot = inTashkent(iso);
    if (slot) set({ date: slot.format('YYYY-MM-DD'), time: slot.format('HH:mm') });
  };

  const submit = async () => {
    const err = validateZoomForm(form);
    if (err === 'topicRequired') {
      setTopicError(t('zoom.topicRequired'));
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      topicRef.current?.focus();
      return;
    }
    if (err) return setError(t(`zoom.${err}`));
    try {
      const m = await create.mutateAsync(buildCreateBody(form));
      toast.success(t(autoApprove ? 'zoom.opened' : 'zoom.requested'));
      onClose();
      // Taklifnoma faqat havola qaytgan bo'lsa (auto-approve); kutilayotgan so'rovda berilmaydi.
      if (m?.join_url) onCreated(m);
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const title = autoApprove ? t('zoom.openMeeting') : t('zoom.request');

  return (
    <Sheet visible onClose={onClose} title={title}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <FormInput
          testID="zoom-topic"
          inputRef={topicRef}
          label={t('zoom.fieldTopic')}
          value={form.topic}
          onChangeText={(v) => set({ topic: v })}
          error={topicError ?? undefined}
          required
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <SelectField
              testID="zoom-date"
              label={t('zoom.fieldDate')}
              value={form.date ? dayjs(form.date).format('DD.MM.YYYY') : ''}
              icon="calendar"
              onPress={() => setPicker('date')}
            />
          </View>
          <View style={styles.flex}>
            <SelectField
              testID="zoom-time"
              label={t('zoom.fieldTime')}
              value={form.time}
              icon="clock"
              onPress={() => setPicker('time')}
            />
          </View>
        </View>

        {/* Davomiylik «soat + daqiqa» — v2 DurationPicker kabi ikki tanlagich yonma-yon (sana/vaqt
            qatori bilan bir xil to'r); serverga baribir duration_minutes. */}
        <View style={styles.group}>
          <Text variant="label" tone="muted">
            {t('zoom.fieldDuration')}
          </Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <SelectField
                testID="zoom-hours"
                label={t('zoom.durationHours')}
                value={String(hours)}
                onPress={() => setPicker('hours')}
              />
            </View>
            <View style={styles.flex}>
              <SelectField
                testID="zoom-minutes"
                label={t('zoom.durationMinutes')}
                value={String(minutes)}
                onPress={() => setPicker('minutes')}
              />
            </View>
          </View>
          <Text variant="caption" tone="subtle">
            {t('zoom.durationHint')}
          </Text>
        </View>

        <View style={styles.group}>
          <Text variant="label" tone="muted">
            {t('zoom.repeat')}
          </Text>
          <View style={styles.chips}>
            {REPEATS.map((r) => (
              <Chip
                key={r}
                testID={`zoom-repeat-${r}`}
                label={t(REPEAT_LABEL[r])}
                selected={form.repeat === r}
                onPress={() => set({ repeat: r })}
              />
            ))}
          </View>
          {form.repeat !== 'none' && (
            <View style={styles.row}>
              <View style={styles.flex}>
                <FormInput
                  testID="zoom-interval"
                  label={`${t('zoom.repeatInterval')} (${t(UNIT_LABEL[form.repeat])})`}
                  value={form.interval}
                  onChangeText={(v) => set({ interval: v.replace(/\D/g, '') })}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.flex}>
                <FormInput
                  testID="zoom-count"
                  label={t('zoom.repeatCount')}
                  value={form.count}
                  onChangeText={(v) => set({ count: v.replace(/\D/g, '') })}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          )}
          {form.repeat === 'weekly' && (
            <>
              <View style={styles.chips}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                  const fixed = d === startWeekday;
                  return (
                    <Chip
                      key={d}
                      testID={`zoom-wd-${d}`}
                      label={t(`zoom.wd${d}`)}
                      selected={fixed || form.weekdays.includes(d)}
                      onPress={fixed ? undefined : () => toggleWeekday(d)}
                    />
                  );
                })}
              </View>
              <Text variant="caption" tone="subtle">
                {t('zoom.weekdayStartFixed')}
              </Text>
            </>
          )}
          {preview.length > 0 && (
            <Text variant="caption" tone="subtle" testID="zoom-repeat-preview">
              {`${t('zoom.repeatPreview', { count: preview.length })}: ${previewDays(preview)}`}
            </Text>
          )}
        </View>

        <FormInput
          testID="zoom-agenda"
          label={t('zoom.fieldAgenda')}
          value={form.agenda}
          onChangeText={(v) => set({ agenda: v })}
          multiline
        />

        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text variant="body">{t('zoom.record')}</Text>
            {/* Server qoidasi: belgi o'zi yozmaydi — yozuv «Boshlash» bosilganda yoqiladi. */}
            <Text variant="caption" tone="subtle">
              {t('zoom.recordingAfterStart')}
            </Text>
          </View>
          <Toggle
            testID="zoom-record"
            value={form.record}
            onValueChange={(v) => set({ record: v })}
          />
        </View>
        <View style={styles.switchRow}>
          <Text variant="body" style={styles.flex}>
            {t('zoom.waitingRoom')}
          </Text>
          <Toggle
            testID="zoom-waiting"
            value={form.waitingRoom}
            onValueChange={(v) => set({ waitingRoom: v })}
          />
        </View>

        {/* Band/bo'sh — serverning hukmi (limit uning muhitida); forma faqat ko'rsatadi. */}
        {verdict ? (
          <View
            testID="zoom-verdict"
            style={[styles.verdict, { backgroundColor: verdict.is_free ? c.successSoft : c.dangerSoft }]}
          >
            <Text variant="label" tone={verdict.is_free ? 'success' : 'danger'} weight="600">
              {t(verdict.is_free ? 'zoom.slotFree' : 'zoom.slotBusy', {
                busy: verdict.overlapping_count,
                limit: verdict.max_concurrent,
              })}
            </Text>
            {!verdict.is_free && !!verdict.next_free_at && (
              <Pressable
                testID="zoom-next-free"
                accessibilityRole="button"
                onPress={() => jumpToFree(verdict.next_free_at!)}
              >
                <Text variant="label">
                  {`${t('zoom.nextFree')}: `}
                  <Text variant="label" tone="link">
                    {inTashkent(verdict.next_free_at)?.format('DD.MM.YYYY HH:mm') ?? ''}
                  </Text>
                </Text>
              </Pressable>
            )}
            {verdict.meetings.length > 0 && (
              <View style={styles.schedule}>
                <Text variant="caption" tone="subtle">
                  {t('zoom.daySchedule')}
                </Text>
                {verdict.meetings.map((s) => (
                  <Text key={s.id} variant="caption" tone="muted">
                    {`${inTashkent(s.start_at)?.format('HH:mm') ?? '—'}${
                      s.end_at ? `–${inTashkent(s.end_at)?.format('HH:mm') ?? ''}` : ''
                    } · ${s.topic || '—'}${s.requested_by ? ` (${s.requested_by})` : ''}`}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ) : (
          availability.isFetching && (
            <Text variant="caption" tone="subtle">
              {t('zoom.slotChecking')}
            </Text>
          )
        )}

        {!!error && (
          <Text variant="label" tone="danger" testID="zoom-form-error">
            {error}
          </Text>
        )}
        <Button
          testID="zoom-submit"
          label={autoApprove ? t('zoom.openMeeting') : t('zoom.send')}
          onPress={() => void submit()}
          loading={create.isPending}
          disabled={submitBlocked(verdict)}
          full
          size="lg"
        />
      </ScrollView>
      {picker === 'date' && (
        <DatePickerModal
          visible
          value={form.date}
          title={t('zoom.fieldDate')}
          onConfirm={(d) => set({ date: d })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'time' && (
        <DateTimePickerModal
          visible
          value={startAt}
          title={t('zoom.fieldTime')}
          onConfirm={(iso) => {
            // Picker qurilma soatida ishlaydi; devor soati qaytariladi (TZ siljishisiz).
            const d = dayjs(iso);
            set({ date: d.format('YYYY-MM-DD'), time: d.format('HH:mm') });
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'hours' && (
        <PickerModal
          avatars={false}
          visible
          title={t('zoom.durationHours')}
          options={DUR_HOURS.map((h) => ({ value: h, label: String(h) }))}
          selected={hours}
          onClose={() => setPicker(null)}
          onSelect={(h) => {
            set({ duration: composeDuration(h, minutes) });
            setPicker(null);
          }}
        />
      )}
      {picker === 'minutes' && (
        <PickerModal
          avatars={false}
          visible
          title={t('zoom.durationMinutes')}
          options={DUR_MINUTES.map((mm) => ({ value: mm, label: String(mm) }))}
          selected={minutes}
          onClose={() => setPicker(null)}
          onSelect={(mm) => {
            set({ duration: composeDuration(hours, mm) });
            setPicker(null);
          }}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  form: { gap: 12, paddingBottom: 8 },
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verdict: { gap: 6, padding: 12, borderRadius: radii.md },
  schedule: { gap: 2 },
});
