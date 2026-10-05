// Mashina so'rovi tafsiloti (v2 RequestRow + RequestActionModal + yakunlash modali) — bitta
// varaqda: safar konteksti, bosqichlar (tasdiq → biriktirish → safar → yakun) va QATOR
// bayroqlariga ko'ra amallar: «Qaror qilish» (can_approve), «Mashina biriktirish»
// (can_respond + pending), «Yakunlash» (can_finalize + mashina bor). Izoh majburiy.
// Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { useBreakpoint } from '@/utils/responsive';
import { Avatar, Badge, Button, Chip, SelectField, Sheet, Text } from '@/ui';
import { driversQuery, vehiclesQuery } from '../api/queries';
import { useApproveRequest, useFinalizeRequest, useRespondRequest } from '../api/mutations';
import {
  approveBody,
  dateRangeText,
  driverPickerOptions,
  finalizeBody,
  fmtMoney,
  requestActions,
  requestFigures,
  requestSteps,
  reqTone,
  respondBody,
  STEP_TONE,
  vehiclePickerOptions,
  type VehicleRequest,
} from '../utils/vehicles';
import { PlateChip } from './FleetBits';

type Mode = null | 'decide' | 'attach' | 'finalize';

export function RequestSheet({ req: r, onClose }: { req: VehicleRequest; onClose: () => void }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>(null);
  const can = requestActions(r);
  const { km, cost } = requestFigures(r);
  const who = [r.employee_position, r.department_name].filter(Boolean).join(' · ');
  const where = [...(r.destination_names ?? []), ...(r.regions ?? [])].filter(Boolean).join(', ');

  return (
    <Sheet visible onClose={onClose} title={r.employee_name || '—'}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Avatar name={r.employee_name || '?'} uri={r.employee_photo_thumb_path || r.employee_photo_path} size={40} />
          <View style={styles.flex}>
            {!!who && (
              <Text variant="caption" tone="muted">
                {who}
              </Text>
            )}
            <View style={styles.badges}>
              {!!r.status && (
                <Badge label={t(`vehicles.status_${r.status}`, { defaultValue: r.status })} tone={reqTone(r.status)} />
              )}
              {!!r.letter_number && (
                <Text variant="caption" tone="subtle">
                  #{r.letter_number}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.info}>
          <Text variant="body">{dateRangeText(r.start_date, r.end_date)}</Text>
          {!!where && (
            <Text variant="body" tone="muted">
              {where}
            </Text>
          )}
          {km != null && (
            <Text variant="caption" tone="muted">
              {`${fmtMoney(km)} ${t('vehicles.unitKm')}${cost != null ? ` · ${fmtMoney(cost)} ${t('vehicles.sum')}` : ''}`}
            </Text>
          )}
          {!!r.purpose && (
            <Text variant="body" tone="muted">
              {r.purpose}
            </Text>
          )}
          {!!r.request_note && (
            <Text variant="caption" tone="muted">{`${t('vehicles.requestNote')}: ${r.request_note}`}</Text>
          )}
          {!!r.vehicle && (
            <View style={styles.car}>
              <PlateChip plate={r.vehicle.plate_number} small />
              <Text variant="caption" tone="muted" style={styles.flex}>
                {[
                  r.vehicle.model_name,
                  r.assigned_driver?.legal_name ? `${t('vehicles.driver')}: ${r.assigned_driver.legal_name}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          )}
          {!!(r.approval_note || r.response_text) && (
            <Text variant="body" tone="danger">
              {r.approval_note || r.response_text}
            </Text>
          )}
        </View>

        <View style={styles.steps} testID="vehicle-req-steps">
          {requestSteps(r).map((s, i) => (
            <Badge
              key={s.key}
              testID={`vehicle-step-${s.key}-${s.state}`}
              label={`${i + 1}. ${t(`vehicles.step_${s.key}`)}${s.hint ? ` · ${s.hint}` : ''}`}
              tone={STEP_TONE[s.state]}
            />
          ))}
        </View>

        {mode === null && (can.decide || can.attach || can.finalize) && (
          <View style={styles.actions}>
            {can.decide && (
              <Button testID="vehicle-req-decide" label={t('vehicles.decide')} onPress={() => setMode('decide')} full />
            )}
            {can.attach && (
              <Button testID="vehicle-req-attach" label={t('vehicles.attach')} onPress={() => setMode('attach')} full />
            )}
            {can.finalize && (
              <Button
                testID="vehicle-req-finalize"
                label={t('vehicles.finalize')}
                variant="soft"
                onPress={() => setMode('finalize')}
                full
              />
            )}
          </View>
        )}
        {mode === 'decide' && <DecideForm r={r} onDone={onClose} onCancel={() => setMode(null)} />}
        {mode === 'attach' && <AttachForm r={r} onDone={onClose} onCancel={() => setMode(null)} />}
        {mode === 'finalize' && <FinalizeForm r={r} onDone={onClose} onCancel={() => setMode(null)} />}
      </ScrollView>
    </Sheet>
  );
}

type FormProps = { r: VehicleRequest; onDone: () => void; onCancel: () => void };

/** Bosh apparat tasdiqlovchisi: avtoparkka o'tkazish yoki rad (izoh ikkalasida ham majburiy). */
function DecideForm({ r, onDone, onCancel }: FormProps) {
  const { t } = useTranslation();
  const approve = useApproveRequest();
  // Telefonda «Avtoparkka o'tkazish» ikki qatorga bo'linardi — tugmalar ustma-ust, asosiysi yuqorida.
  const { sizeClass } = useBreakpoint();
  const compact = sizeClass === 'compact';
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const run = async (approved: boolean) => {
    const b = approveBody(approved, note);
    if (!b.ok) return setError(t(b.error));
    try {
      await approve.mutateAsync({ id: r.id, body: b.body });
      toast.success(approved ? t('vehicles.done') : t('vehicles.refused'));
      onDone();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form}>
      <Text variant="heading">{t('vehicles.decide')}</Text>
      <NoteField
        note={note}
        setNote={(v) => {
          setNote(v);
          setError(null);
        }}
      />
      <FormError error={error} />
      <View style={compact ? styles.stack : styles.row}>
        <View style={compact ? undefined : styles.flex}>
          <Button
            testID="vehicle-decide-refuse"
            label={t('vehicles.refuse')}
            variant="danger"
            loading={approve.isPending}
            onPress={() => void run(false)}
            full
          />
        </View>
        <View style={compact ? undefined : styles.flex}>
          <Button
            testID="vehicle-decide-pass"
            label={t('vehicles.pass')}
            loading={approve.isPending}
            onPress={() => void run(true)}
            full
          />
        </View>
      </View>
      <Button label={t('common.cancel')} variant="neutral" onPress={onCancel} full />
    </View>
  );
}

/**
 * Avtopark javobi: mashina + haydovchi biriktiriladi (yoki rad). Tanlagichlar safarning O'Z
 * sanalari bilan — band mashina/haydovchi tanlanmaydi; `exclude_letter_id` shu safarning o'z
 * bandligini hisobga olmaydi. Birga ketadiganlar — SERVER tekshirgan nomzodlar.
 */
function AttachForm({ r, onDone, onCancel }: FormProps) {
  const { t } = useTranslation();
  const respond = useRespondRequest();
  const range = { from: r.start_date, to: r.end_date, excludeLetterId: r.letter_id };
  const cars = useQuery(vehiclesQuery('', true, range));
  const drivers = useQuery(driversQuery(range, true));
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [alsoIds, setAlsoIds] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [picker, setPicker] = useState<null | 'vehicle' | 'driver'>(null);
  const [error, setError] = useState<string | null>(null);
  const carOpts = vehiclePickerOptions(cars.data ?? [], t);
  const driverOpts = driverPickerOptions(drivers.data ?? []);
  const peers = r.shared_candidates ?? [];

  const run = async (approved: boolean) => {
    const b = respondBody({ approved, vehicleId, driverId, note, alsoIds });
    if (!b.ok) return setError(t(b.error));
    try {
      await respond.mutateAsync({ id: r.id, body: b.body });
      toast.success(approved ? t('vehicles.done') : t('vehicles.refused'));
      onDone();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const opts = picker === 'vehicle' ? carOpts : driverOpts;
  return (
    <View style={styles.form}>
      <Text variant="heading">{t('vehicles.attach')}</Text>
      <SelectField
        testID="vehicle-attach-car"
        label={`${t('vehicles.pickVehicle')} *`}
        value={carOpts.find((o) => o.value === vehicleId)?.label ?? ''}
        placeholder={t('vehicles.pick')}
        onPress={() => setPicker('vehicle')}
      />
      <SelectField
        testID="vehicle-attach-driver"
        label={t('vehicles.pickDriver')}
        value={driverOpts.find((o) => o.value === driverId)?.label ?? ''}
        placeholder={t('vehicles.pick')}
        onPress={() => setPicker('driver')}
      />
      <Text variant="caption" tone="subtle">
        {t('vehicles.driverHint')}
      </Text>
      {peers.length > 0 && (
        <View style={styles.peers}>
          <Text variant="label" tone="muted">
            {t('vehicles.alsoRequests')}
          </Text>
          <View style={styles.badges}>
            {peers.map((p) => (
              <Chip
                key={p.request_id}
                testID={`vehicle-also-${p.request_id}`}
                label={p.employee_name ?? `#${p.request_id}`}
                selected={alsoIds.includes(p.request_id)}
                onPress={() =>
                  setAlsoIds((prev) =>
                    prev.includes(p.request_id) ? prev.filter((x) => x !== p.request_id) : [...prev, p.request_id],
                  )
                }
              />
            ))}
          </View>
          <Text variant="caption" tone="subtle">
            {t('vehicles.alsoRequestsHint')}
          </Text>
        </View>
      )}
      <NoteField
        note={note}
        setNote={(v) => {
          setNote(v);
          setError(null);
        }}
      />
      <FormError error={error} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            testID="vehicle-attach-refuse"
            label={t('vehicles.refuse')}
            variant="danger"
            loading={respond.isPending}
            onPress={() => void run(false)}
            full
          />
        </View>
        <View style={styles.flex}>
          <Button
            testID="vehicle-attach-give"
            label={t('vehicles.give')}
            loading={respond.isPending}
            onPress={() => void run(true)}
            full
          />
        </View>
      </View>
      <Button label={t('common.cancel')} variant="neutral" onPress={onCancel} full />
      {picker && (
        <PickerModal
          visible
          title={picker === 'vehicle' ? t('vehicles.pickVehicle') : t('vehicles.pickDriver')}
          avatars={picker !== 'vehicle'}
          options={opts}
          disabledValues={opts.filter((o) => o.disabled).map((o) => o.value)}
          loading={picker === 'vehicle' ? cars.isFetching : drivers.isFetching}
          selected={picker === 'vehicle' ? vehicleId : driverId}
          onClose={() => setPicker(null)}
          onSelect={(id) => {
            if (picker === 'vehicle') setVehicleId(id);
            else setDriverId(id);
            setPicker(null);
            setError(null);
          }}
        />
      )}
    </View>
  );
}

/** Safardan keyin ANIQ xarajat: GPS bo'lsa server o'zi oladi, aks holda km kiritiladi. */
function FinalizeForm({ r, onDone, onCancel }: FormProps) {
  const { t } = useTranslation();
  const finalize = useFinalizeRequest();
  const [km, setKm] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    const b = finalizeBody(km, note);
    if (!b.ok) return setError(t(b.error));
    try {
      await finalize.mutateAsync({ id: r.id, body: b.body });
      toast.success(t('vehicles.finalized'));
      onDone();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.form}>
      <Text variant="heading">{t('vehicles.finalize')}</Text>
      <Text variant="caption" tone="subtle">
        {t('vehicles.finalizeHint')}
      </Text>
      <FormInput
        testID="vehicle-finalize-km"
        label={t('vehicles.actualKm')}
        value={km}
        onChangeText={(v) => {
          setKm(v);
          setError(null);
        }}
        placeholder={t('vehicles.actualKmHint')}
        keyboardType="decimal-pad"
      />
      <FormInput label={t('vehicles.note')} value={note} onChangeText={setNote} multiline />
      <FormError error={error} />
      <Button
        testID="vehicle-finalize-save"
        label={t('common.save')}
        loading={finalize.isPending}
        onPress={() => void save()}
        full
      />
      <Button label={t('common.cancel')} variant="neutral" onPress={onCancel} full />
    </View>
  );
}

function NoteField({ note, setNote }: { note: string; setNote: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <>
      <FormInput
        testID="vehicle-req-note"
        label={t('vehicles.note')}
        value={note}
        onChangeText={setNote}
        multiline
        required
      />
      <Text variant="caption" tone="subtle">
        {t('vehicles.noteHint')}
      </Text>
    </>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Text variant="label" tone="danger" testID="vehicle-req-error">
      {error}
    </Text>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 14, paddingBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  info: { gap: 4 },
  car: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { gap: 8 },
  form: { gap: 10 },
  peers: { gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
  stack: { flexDirection: 'column-reverse', gap: 8 },
  flex: { flex: 1, minWidth: 0 },
});
