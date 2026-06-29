import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { VISITORS_LIST, VISITOR_DETAIL } from '../src/api/urls';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { FormInput } from '../src/components/FormInput';
import { Icon } from '../src/components/Icon';
import { DateTimePickerModal } from '../src/components/DateTimePicker';
import type { Visitor } from '../src/types';

export default function MehmonFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const visitorId = Number(id);
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const qc = useQueryClient();

  const [legalName, setLegalName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [jobPosition, setJobPosition] = useState('');
  const [telegram, setTelegram] = useState('');
  const [phone, setPhone] = useState('');
  const [validFrom, setValidFrom] = useState<string>(dayjs().toISOString());
  const [validUntil, setValidUntil] = useState<string>(dayjs().add(1, 'day').toISOString());
  const [picker, setPicker] = useState<null | 'from' | 'until'>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await apiClient.get<Visitor>(VISITOR_DETAIL(visitorId));
        setLegalName(data.legal_name ?? '');
        setOrgName(data.organization_name ?? '');
        setJobPosition(data.job_position ?? '');
        setTelegram(data.telegram_username ?? '');
        setPhone(data.phone_number ?? '');
        if (data.valid_from) setValidFrom(data.valid_from);
        if (data.valid_until) setValidUntil(data.valid_until);
      } catch {} finally {
        setHydrating(false);
      }
    })();
  }, [isEdit, visitorId]);

  const save = async () => {
    if (!legalName.trim()) { setError('Ism-sharif kiritilishi shart'); return; }
    if (dayjs(validFrom).isAfter(dayjs(validUntil))) {
      Alert.alert('Xatolik', "Ketish vaqti kelish vaqtidan keyin bo'lishi kerak");
      return;
    }
    setLoading(true);
    const orgBranchId =
      user?.employee?.organization_branches?.[0]?.id ??
      user?.employee?.department?.organization_branch_id;
    const payload: any = {
      legal_name: legalName.trim(),
      organization_name: orgName.trim(),
      job_position: jobPosition.trim(),
      telegram_username: telegram.trim().replace(/^@/, ''),
      phone_number: phone.trim(),
      valid_from: validFrom,
      valid_until: validUntil,
    };
    if (!isEdit && orgBranchId) payload.organization_branch_id = orgBranchId;
    try {
      if (isEdit) await apiClient.patch(VISITOR_DETAIL(visitorId), payload);
      else await apiClient.post(VISITORS_LIST, payload);
      qc.invalidateQueries({ queryKey: ['visitors'] });
      if (isEdit) qc.invalidateQueries({ queryKey: ['visitor', visitorId] });
      router.back();
    } catch (e: any) {
      Alert.alert('Xatolik', e?.response?.data?.detail || "Saqlashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={isEdit ? 'Mehmonni tahrirlash' : "Yangi mehmon"} />
      {hydrating ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FormInput label="F.I.SH" value={legalName} onChangeText={(t) => { setLegalName(t); setError(''); }} placeholder="Azimov Jasur Shamsiyevich" required error={error} />
          <FormInput label="Tashkilot nomi" value={orgName} onChangeText={setOrgName} placeholder="O'zbekiston Milliy Banki" />
          <FormInput label="Lavozim" value={jobPosition} onChangeText={setJobPosition} placeholder="Bosh mutaxassis" />
          <FormInput label="Telegram" value={telegram} onChangeText={setTelegram} placeholder="jasur_azimov" />
          <FormInput label="Telefon raqami" value={phone} onChangeText={setPhone} placeholder="+998 90 123 45 67" keyboardType="phone-pad" />

          <Text style={styles.dateGroupLabel}>Kelish — Ketish vaqti</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateField} onPress={() => setPicker('from')} activeOpacity={0.7}>
              <Text style={styles.dateLabel}>Kelish</Text>
              <View style={styles.dateValueRow}>
                <Icon name="calendar" size={15} color={colors.primary} />
                <Text style={styles.dateValue}>{dayjs(validFrom).format('DD.MM.YYYY')}</Text>
              </View>
              <View style={styles.dateValueRow}>
                <Icon name="clock" size={15} color={colors.textSecondary} />
                <Text style={styles.dateTime}>{dayjs(validFrom).format('HH:mm')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateField} onPress={() => setPicker('until')} activeOpacity={0.7}>
              <Text style={styles.dateLabel}>Ketish</Text>
              <View style={styles.dateValueRow}>
                <Icon name="calendar" size={15} color={colors.primary} />
                <Text style={styles.dateValue}>{dayjs(validUntil).format('DD.MM.YYYY')}</Text>
              </View>
              <View style={styles.dateValueRow}>
                <Icon name="clock" size={15} color={colors.textSecondary} />
                <Text style={styles.dateTime}>{dayjs(validUntil).format('HH:mm')}</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Ushbu muddatda mehmon kirish huquqiga ega bo'ladi.</Text>

          <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.6 }]} onPress={save} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={colors.onPrimary} /> : (
              <>
                <Icon name="check" size={18} color={colors.onPrimary} />
                <Text style={styles.saveText}>Saqlash</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <DateTimePickerModal
        visible={picker === 'from'}
        value={validFrom}
        title="Kelish vaqti"
        onConfirm={(iso) => setValidFrom(iso)}
        onClose={() => setPicker(null)}
      />
      <DateTimePickerModal
        visible={picker === 'until'}
        value={validUntil}
        title="Ketish vaqti"
        onConfirm={(iso) => setValidUntil(iso)}
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

    dateGroupLabel: { fontSize: 13, color: c.textSecondary, fontWeight: '600', marginBottom: 8, marginTop: 2 },
    dateRow: { flexDirection: 'row', gap: 12 },
    dateField: { flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12, padding: 12 },
    dateLabel: { fontSize: 11, color: c.textMuted, marginBottom: 6 },
    dateValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    dateValue: { fontSize: 14, color: c.text, fontWeight: '600' },
    dateTime: { fontSize: 14, color: c.textSecondary, fontWeight: '600' },
    hint: { fontSize: 11, color: c.textMuted, marginTop: 8 },

    saveBtn: { flexDirection: 'row', gap: 8, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
    saveText: { color: c.onPrimary, fontSize: 16, fontWeight: '700' },
  });
