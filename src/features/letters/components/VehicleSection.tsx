import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { Letter, User, Vehicle } from '@/types';
import { Icon } from '@/components/Icon';
import { getApiErrorMessage } from '@/api/errors';
import { normalizeLetterType } from '@/utils/letterStatus';
import { isSiteMasterAdmin } from '@/utils/roles';
import { Section, KV } from './DetailParts';
import { vehicleAccessQuery, availableVehiclesQuery } from '../api/queries';
import { useSetTripVehicle, useRespondVehicleRequest } from '../api/mutations';

// Xizmat safari kartochkasidagi MASHINA bloki (web parity: VehicleRequestPanel).
//
// Oqim: xodim MASHINANI TANLAMAYDI — u faqat "mashina kerak" deydi; mashinani
// va haydovchini BFD transport mas'uli biriktiradi va shu payt HAYDOVCHIGA
// xizmat safari avtomatik ochilib ro'yxatga olinadi (serverda).
//
// Kim nima ko'radi (bayroqlarni SERVER beradi; ruxsat baribir serverda):
//   • hamma       — holat, biriktirilgan mashina/haydovchi, xarajat;
//   • safar egasi — "Mashina kerak" / "Kerak emas";
//   • BFD mas'uli (`request.can_respond`) — mashina tanlab biriktirish / rad etish.

export function VehicleSection({
  letter,
  user,
  onChanged,
}: {
  letter: Letter;
  user: User | null | undefined;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [mode, setMode] = useState<null | 'approve' | 'reject'>(null);
  const [note, setNote] = useState('');
  const [pickedVehicleId, setPickedVehicleId] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [askNote, setAskNote] = useState('');

  const isTrip = normalizeLetterType(letter.letter_type) === 'business_trip';
  const request = letter.vehicle_request ?? null;

  const { data: access } = useQuery(vehicleAccessQuery());
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery(
    availableVehiclesQuery(
      letter.departure_date,
      letter.arrival_date,
      letter.id,
      mode === 'approve',
    ),
  );

  const setVehicle = useSetTripVehicle(letter.id);
  const respond = useRespondVehicleRequest(request?.id ?? 0);

  // Safar egasi (yoki sayt master-admini) so'rovni qo'yadi/oladi. Yakunlangan
  // safarda o'zgartirilmaydi — server ham shu shartni tekshiradi.
  const isOwner =
    isSiteMasterAdmin(user) ||
    [letter.creator_employee_id, letter.submitter_id, letter.employee_id].includes(
      user?.employee?.id,
    );
  const canChange =
    isOwner && !['cancelled', 'rejected', 'report_approved'].includes(letter.status ?? '');
  const branchAllowed = (access?.requester_branch_ids ?? [])
    .map(Number)
    .includes(Number(letter.organization_branch_id));

  const pickedVehicle = useMemo(
    () => vehicles.find((v: Vehicle) => v.id === pickedVehicleId) ?? null,
    [vehicles, pickedVehicleId],
  );

  if (!isTrip) return null;
  // Mashina ham so'ralmagan, so'rash huquqi ham yo'q — blokni umuman chizmaymiz.
  if (!request && (!canChange || !branchAllowed)) return null;

  const ask = (needed: boolean) => {
    setVehicle.mutate(
      { needed, note: needed ? askNote.trim() || null : null },
      {
        onSuccess: () => {
          setAsking(false);
          setAskNote('');
          onChanged();
        },
        onError: (e) => Alert.alert(t('common.error'), getApiErrorMessage(e)),
      },
    );
  };

  const submitResponse = (approved: boolean) => {
    if (!approved && !note.trim()) {
      Alert.alert(t('common.error'), t('letters.vehicleRejectReasonRequired'));
      return;
    }
    if (approved && !pickedVehicleId) {
      Alert.alert(t('common.error'), t('letters.vehiclePickRequired'));
      return;
    }
    respond.mutate(
      {
        approved,
        response_text: note.trim() || null,
        ...(approved
          ? {
              vehicle_id: pickedVehicleId,
              // Bo'sh — server mashinaning doimiy haydovchisini oladi. Mobilda
              // haydovchini almashtirish YO'Q (web'da bor) — mashinasiga
              // biriktirilgani ketadi.
              assigned_driver_employee_id: null,
            }
          : {}),
      },
      {
        onSuccess: () => {
          setMode(null);
          setNote('');
          setPickedVehicleId(null);
          onChanged();
        },
        onError: (e) => Alert.alert(t('common.error'), getApiErrorMessage(e)),
      },
    );
  };

  // ── Mashina hali so'ralmagan ────────────────────────────────────────────────
  if (!request) {
    return (
      <Section title={t('letters.vehicleSection')}>
        {!asking ? (
          <View style={styles.row}>
            <Text style={styles.muted}>{t('letters.vehicleNone')}</Text>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setAsking(true)}>
              <Icon name="briefcase" size={14} color={colors.primary} />
              <Text style={styles.ghostBtnText}>{t('letters.vehicleAsk')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={askNote}
              onChangeText={setAskNote}
              placeholder={t('letters.vehicleNotePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.hint}>{t('letters.vehicleAssignedByBfd')}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.primaryBtn}
                disabled={setVehicle.isPending}
                onPress={() => ask(true)}
              >
                {setVehicle.isPending ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('letters.vehicleAskSubmit')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setAsking(false)}>
                <Text style={styles.ghostBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Section>
    );
  }

  const vehicle = request.vehicle ?? null;
  const driver = request.assigned_driver ?? vehicle?.driver ?? null;
  const statusColor =
    request.status === 'approved'
      ? colors.success
      : request.status === 'rejected'
        ? colors.error
        : colors.warning;
  const statusLabel = t(
    request.status === 'approved'
      ? 'letters.vehicleStatusApproved'
      : request.status === 'rejected'
        ? 'letters.vehicleStatusRejected'
        : 'letters.vehicleStatusPending',
  );

  return (
    <Section title={t('letters.vehicleSection')}>
      <View style={styles.row}>
        <Text style={styles.title}>
          {vehicle ? `${vehicle.plate_number} — ${vehicle.model_name}` : t('letters.vehicleRequested')}
        </Text>
        <Text style={[styles.badge, { color: statusColor, borderColor: statusColor }]}>
          {statusLabel}
        </Text>
      </View>

      {!!request.start_date && !!request.end_date && (
        <Text style={styles.muted}>
          {dayjs(request.start_date).format('DD.MM.YYYY')} — {dayjs(request.end_date).format('DD.MM.YYYY')}
        </Text>
      )}
      {!!request.request_note && <KV k={t('letters.vehicleNote')} v={request.request_note} />}
      {!!driver?.legal_name && <KV k={t('letters.vehicleDriver')} v={driver.legal_name} />}
      {!!request.response_text && <KV k={t('letters.vehicleResponse')} v={request.response_text} />}

      {/* Haydovchiga avtomatik ochilgan (va ro'yxatga olingan) safar. */}
      {!!request.driver_letter_id && (
        <Text style={[styles.hint, { color: colors.success }]}>
          {t('letters.vehicleDriverTripOpened')}
          {request.driver_letter_number ? ` — №${request.driver_letter_number}` : ''}
        </Text>
      )}

      {/* Xarajat: taxminiy (safar boshida) va aniq (tugagach). */}
      {(!!request.distance_km || !!request.actual_distance_km) && (
        <View style={styles.costBox}>
          {!!request.distance_km && (
            <Text style={styles.muted}>
              {t('letters.vehicleCostEstimated')}: ~{request.distance_km} km
              {request.fuel_liters ? ` · ~${request.fuel_liters} l` : ''}
              {request.fuel_cost ? ` · ~${Math.round(request.fuel_cost).toLocaleString('ru-RU')} ${t('letters.sum')}` : ''}
            </Text>
          )}
          {!!request.actual_distance_km && (
            <Text style={[styles.muted, { color: colors.success }]}>
              {t('letters.vehicleCostActual')}: {request.actual_distance_km} km
              {request.actual_fuel_liters ? ` · ${request.actual_fuel_liters} l` : ''}
              {request.actual_fuel_cost ? ` · ${Math.round(request.actual_fuel_cost).toLocaleString('ru-RU')} ${t('letters.sum')}` : ''}
            </Text>
          )}
        </View>
      )}

      {/* SAFAR EGASI: mashinadan voz kechish / qayta so'rash. */}
      {canChange && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.ghostBtn}
            disabled={setVehicle.isPending}
            onPress={() => ask(false)}
          >
            <Text style={styles.ghostBtnText}>{t('letters.vehicleNotNeeded')}</Text>
          </TouchableOpacity>
          {request.status === 'rejected' && (
            <TouchableOpacity
              style={styles.ghostBtn}
              disabled={setVehicle.isPending}
              onPress={() => ask(true)}
            >
              <Text style={styles.ghostBtnText}>{t('letters.vehicleAskAgain')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* BFD TRANSPORT MAS'ULI: mashina biriktirish / rad etish. */}
      {!!request.can_respond && (
        <View style={styles.respondBox}>
          {mode === 'approve' && (
            <>
              <Text style={styles.hint}>{t('letters.vehiclePickHint')}</Text>
              {vehiclesLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                vehicles.map((v: Vehicle) => {
                  const selected = v.id === pickedVehicleId;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.vehicleRow, selected && styles.vehicleRowActive]}
                      disabled={!!v.is_busy}
                      onPress={() => setPickedVehicleId(v.id)}
                    >
                      <Text style={[styles.vehicleName, v.is_busy && styles.disabledText]}>
                        {v.plate_number} — {v.model_name}
                      </Text>
                      <Text style={styles.vehicleMeta}>
                        {v.is_busy
                          ? t('letters.vehicleBusy')
                          : [v.vehicle_type_label, v.driver?.legal_name].filter(Boolean).join(' · ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
              {!!pickedVehicle && !pickedVehicle.driver_employee_id && (
                <Text style={[styles.hint, { color: colors.error }]}>
                  {t('letters.vehicleNoDriverWarning')}
                </Text>
              )}
            </>
          )}
          {!!mode && (
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder={t(
                mode === 'reject' ? 'letters.vehicleRejectReason' : 'letters.vehicleResponseNote',
              )}
              placeholderTextColor={colors.textMuted}
              multiline
            />
          )}
          {mode === 'approve' && <Text style={styles.hint}>{t('letters.vehicleApproveHint')}</Text>}

          <View style={styles.actions}>
            {mode === null ? (
              <>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    setMode('approve');
                    setNote('');
                    setPickedVehicleId(request.vehicle_id ?? null);
                  }}
                >
                  <Text style={styles.primaryBtnText}>
                    {t(request.status === 'approved' ? 'letters.vehicleReassign' : 'letters.vehicleAssign')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerBtn} onPress={() => { setMode('reject'); setNote(''); }}>
                  <Text style={styles.dangerBtnText}>{t('letters.vehicleReject')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  disabled={respond.isPending}
                  onPress={() => submitResponse(mode === 'approve')}
                >
                  {respond.isPending ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.primaryBtnText}>{t('common.confirm')}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setMode(null)}>
                  <Text style={styles.ghostBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </Section>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    title: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    muted: { fontSize: 13, color: colors.textMuted },
    hint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    badge: {
      fontSize: 11, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    },
    costBox: { marginTop: 6, gap: 2 },
    respondBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 10, gap: 8 },
    input: {
      borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 12,
      paddingVertical: 8, color: colors.text, backgroundColor: colors.cardElevated, marginTop: 8,
    },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    primaryBtn: {
      backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9,
    },
    primaryBtnText: { color: colors.onPrimary, fontSize: 13, fontWeight: '600' },
    ghostBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.cardBorder,
      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    },
    ghostBtnText: { color: colors.text, fontSize: 13 },
    dangerBtn: {
      borderWidth: 1, borderColor: colors.error, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
    },
    dangerBtnText: { color: colors.error, fontSize: 13, fontWeight: '600' },
    vehicleRow: {
      borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, padding: 10, marginTop: 6,
    },
    vehicleRowActive: { borderColor: colors.primary, backgroundColor: colors.cardElevated },
    vehicleName: { fontSize: 13, fontWeight: '600', color: colors.text },
    vehicleMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    disabledText: { color: colors.textMuted },
  });
