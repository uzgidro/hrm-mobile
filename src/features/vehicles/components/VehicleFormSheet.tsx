// Mashina qo'shish / tahrirlash (v2 `VehicleModal`) — faqat `can_manage`. GPS obyektlari tashqi
// kuzatuv xizmatidan (Wialon) faqat forma ochiqda olinadi; xizmat ishlamasa — ID qo'lda.
// Haydovchi — serverning yaroqlilik hukmi bilan (band/kasal/ko'rikdan o'tmagan tanlanmaydi).
// Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { Button, SelectField, Sheet, Text } from '@/ui';
import { driversQuery, fuelTypesQuery, gpsUnitsQuery } from '../api/queries';
import { useCreateVehicle, useUpdateVehicle } from '../api/mutations';
import {
  buildVehicleBody,
  driverPickerOptions,
  seedVehicleForm,
  type Vehicle,
  type VehicleForm,
} from '../utils/vehicles';

type Picker = null | 'fuel' | 'gps' | 'driver';

export function VehicleFormSheet({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<VehicleForm>(() => seedVehicleForm(vehicle));
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const fuels = useQuery(fuelTypesQuery());
  const drivers = useQuery(driversQuery(undefined, true));
  const gps = useQuery(gpsUnitsQuery(true));
  const create = useCreateVehicle();
  const update = useUpdateVehicle();
  const saving = create.isPending || update.isPending;

  const set = (p: Partial<VehicleForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const save = async () => {
    const r = buildVehicleBody(form);
    if (!r.ok) return setError(t(r.error));
    try {
      if (vehicle) await update.mutateAsync({ id: vehicle.id, body: r.body });
      else await create.mutateAsync(r.body);
      toast.success(t('vehicles.saved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const driverOpts = driverPickerOptions(drivers.data ?? []);
  const driverName =
    form.driver_employee_id == null
      ? ''
      : (driverOpts.find((d) => d.value === form.driver_employee_id)?.label ??
        (vehicle?.driver_employee_id === form.driver_employee_id ? vehicle?.driver?.legal_name : null) ??
        `#${form.driver_employee_id}`);
  const fuelName =
    form.fuel_type_id == null
      ? ''
      : (fuels.data?.find((f) => f.id === form.fuel_type_id)?.name ??
        vehicle?.fuel_type_name ??
        `#${form.fuel_type_id}`);
  const gpsUnits = gps.data ?? [];
  const gpsLabel = (() => {
    if (!form.gps_device_id) return '';
    const u = gpsUnits.find((x) => String(x.id) === form.gps_device_id);
    return u ? u.name || u.plate || `#${u.id}` : form.gps_device_id;
  })();

  const pickerProps =
    picker === 'fuel'
      ? {
          title: t('vehicles.colFuel'),
          options: (fuels.data ?? []).map((f) => ({ value: f.id, label: f.name || `#${f.id}` })),
          loading: fuels.isFetching,
          selected: form.fuel_type_id,
          onSelect: (id: number) => set({ fuel_type_id: id }),
        }
      : picker === 'driver'
        ? {
            title: t('vehicles.colDriver'),
            options: driverOpts,
            disabledValues: driverOpts.filter((d) => d.disabled).map((d) => d.value),
            loading: drivers.isFetching,
            selected: form.driver_employee_id,
            onSelect: (id: number) => set({ driver_employee_id: id }),
          }
        : {
            title: t('vehicles.fieldGps'),
            options: gpsUnits.map((u) => ({
              value: u.id,
              label: u.name || u.plate || `#${u.id}`,
              // Obyekt boshqa mashinada — jim «o'g'irlash» birinchi mashinani ko'r qiladi.
              subLabel:
                u.vehicle_id && u.vehicle_id !== vehicle?.id
                  ? t('vehicles.gpsUnitTaken', { plate: u.vehicle_plate ?? '' })
                  : (u.plate ?? undefined),
            })),
            loading: gps.isFetching,
            selected: form.gps_device_id ? Number(form.gps_device_id) : null,
            onSelect: (id: number) => set({ gps_device_id: String(id) }),
          };

  return (
    <Sheet visible onClose={onClose} title={vehicle ? t('vehicles.editTitle') : t('vehicles.add')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <FormInput
          testID="vehicle-form-plate"
          label={t('vehicles.colPlate')}
          value={form.plate_number}
          onChangeText={(v) => set({ plate_number: v.toUpperCase() })}
          required
        />
        <FormInput
          testID="vehicle-form-model"
          label={t('vehicles.colModel')}
          value={form.model_name}
          onChangeText={(v) => set({ model_name: v })}
          required
        />
        <FormInput label={t('vehicles.fieldColor')} value={form.color} onChangeText={(v) => set({ color: v })} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <FormInput
              label={t('vehicles.fieldYear')}
              value={form.year}
              onChangeText={(v) => set({ year: v })}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.flex}>
            <FormInput
              label={t('vehicles.fieldSeats')}
              value={form.seats}
              onChangeText={(v) => set({ seats: v })}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <SelectField
          testID="vehicle-form-fuel"
          label={t('vehicles.colFuel')}
          value={fuelName}
          placeholder={t('vehicles.pick')}
          onPress={() => setPicker('fuel')}
        />
        <FormInput
          label={t('vehicles.fieldConsumption')}
          value={form.fuel_consumption}
          onChangeText={(v) => set({ fuel_consumption: v })}
          keyboardType="decimal-pad"
        />
        {gps.isError ? (
          <>
            <FormInput
              testID="vehicle-form-gps-input"
              label={t('vehicles.fieldGps')}
              value={form.gps_device_id}
              onChangeText={(v) => set({ gps_device_id: v })}
            />
            <Text variant="caption" tone="subtle">
              {t('vehicles.gpsUnitsFailed')}
            </Text>
          </>
        ) : (
          <>
            <SelectField
              testID="vehicle-form-gps"
              label={t('vehicles.fieldGps')}
              value={gpsLabel}
              placeholder={t('vehicles.pick')}
              onPress={() => setPicker('gps')}
            />
            <Text variant="caption" tone="subtle">
              {t('vehicles.gpsUnitHint')}
            </Text>
          </>
        )}
        {!!form.gps_device_id && (
          <Button label={t('vehicles.clearGps')} variant="link" size="sm" onPress={() => set({ gps_device_id: '' })} />
        )}
        <SelectField
          testID="vehicle-form-driver"
          label={t('vehicles.colDriver')}
          value={driverName}
          placeholder={t('vehicles.pick')}
          onPress={() => setPicker('driver')}
        />
        {form.driver_employee_id != null && (
          <Button
            label={t('vehicles.clearDriver')}
            variant="link"
            size="sm"
            onPress={() => set({ driver_employee_id: null })}
          />
        )}
        {!!error && (
          <Text variant="label" tone="danger" testID="vehicle-form-error">
            {error}
          </Text>
        )}
        <Button testID="vehicle-form-save" label={t('common.save')} onPress={() => void save()} loading={saving} full />
      </ScrollView>
      {picker && (
        <PickerModal
          visible
          {...pickerProps}
          onClose={() => setPicker(null)}
          onSelect={(id) => {
            setPicker(null);
            pickerProps.onSelect(id);
          }}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
