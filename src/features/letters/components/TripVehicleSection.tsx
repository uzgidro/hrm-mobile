// Safar uchun AVTOTRANSPORT so'rovi (`letters/{id}/vehicle`).
//
// ⚠️ Mobilда bu amal umuman yo'q edi: xodim mashina so'rashni faqat webdan
// qila olardi. Backend qoidasi (`set_trip_vehicle`): faqat safar EGASI yoki
// yuboruvchisi o'zgartira oladi; yakunlangan/bekor qilingan safarga
// biriktirilmaydi; hujjat MATNIGA tegmaydi, shu bois safar yuborilgandan
// keyin ham ishlaydi (BFD rad etsa xodim qayta so'ray oladi).
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { Letter, User } from '@/types';
import { Icon } from '@/components/Icon';
import { isSiteMasterAdmin } from '@/utils/roles';
import { Section, KV } from './DetailParts';
import { useSetTripVehicle } from '../api/mutations';

const CLOSED_STATUSES = ['cancelled', 'rejected', 'report_approved'];

export function TripVehicleSection({
  letter, user, onChanged,
}: {
  letter: Letter;
  user?: User | null;
  onChanged: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(letter.vehicle_note ?? '');
  const setVehicle = useSetTripVehicle(letter.id);

  const empId = user?.employee?.id;
  const isOwner =
    !!empId && (empId === letter.creator_employee_id || empId === letter.submitter_id);
  const closed = CLOSED_STATUSES.includes(letter.status ?? '');
  const canEdit = isSiteMasterAdmin(user) || (isOwner && !closed);

  // ⚠️ Holat `vehicle_request` dan o'qiladi: `vehicle_needed` backendда
  // faqat YOZISH maydoni (create/update), o'qishda umuman qaytmaydi.
  // Bekor qilingan/rad etilgan so'rov "so'ralgan" hisoblanmaydi — xodim
  // qayta so'ray olishi kerak.
  const req = letter.vehicle_request;
  const needed = !!req && !['cancelled', 'rejected'].includes(req.status ?? '');

  // So'rov ham yo'q, o'zgartirish huquqi ham yo'q — bo'limni umuman chizmaymiz.
  if (!needed && !canEdit) return null;

  const toggle = async (value: boolean) => {
    await setVehicle.mutateAsync({ needed: value, note: value ? note || null : null });
    onChanged();
  };

  return (
    <Section title={t('letters.sectionVehicle')}>
      <KV k={t('letters.vehicleNeeded')} v={needed ? t('common.yes') : t('common.no')} />
      {!!(req?.request_note || letter.vehicle_note) && (
        <KV k={t('letters.vehicleNote')} v={req?.request_note || letter.vehicle_note || ''} />
      )}
      {!!req?.status && <KV k={t('letters.vehicleStatus')} v={t(`letters.vehicleStatus_${req.status}`)} />}
      {!!req?.vehicle && (
        <KV
          k={t('letters.vehicleAssigned')}
          v={[req.vehicle.model, req.vehicle.plate_number].filter(Boolean).join(' · ')}
        />
      )}

      {canEdit && (
        <View style={styles.actions}>
          {noteOpen && !needed && (
            <TextInput
              style={styles.input}
              placeholder={t('letters.vehicleNotePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
            />
          )}
          <TouchableOpacity
            style={[styles.btn, needed ? styles.btnGhost : styles.btnPrimary]}
            disabled={setVehicle.isPending}
            onPress={() => (needed ? toggle(false) : (noteOpen ? toggle(true) : setNoteOpen(true)))}
            activeOpacity={0.85}
            testID="trip-vehicle-toggle"
          >
            {setVehicle.isPending ? (
              <ActivityIndicator size="small" color={needed ? colors.textSecondary : colors.onPrimary} />
            ) : (
              <>
                <Icon name="briefcase" size={16} color={needed ? colors.textSecondary : colors.onPrimary} />
                <Text style={needed ? styles.btnGhostText : styles.btnPrimaryText}>
                  {needed ? t('letters.vehicleCancel') : t('letters.vehicleRequest')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </Section>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    actions: { marginTop: 10, gap: 8 },
    input: {
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontSize: 14, minHeight: 60,
      textAlignVertical: 'top',
    },
    btn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderRadius: 12, paddingVertical: 12,
    },
    btnPrimary: { backgroundColor: c.primary },
    btnPrimaryText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
    btnGhost: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder },
    btnGhostText: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
  });
