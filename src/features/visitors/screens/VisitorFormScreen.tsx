import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormInput } from '@/components/FormInput';
import { Icon } from '@/components/Icon';
import { LoadingView } from '@/components/StateViews';
import { DateTimePickerModal } from '@/components/DateTimePicker';
import { getApiErrorMessage } from '@/api/errors';
import { getVisitor } from '../api/queries';
import {
  useCreateVisitor,
  useUpdateVisitor,
  validateVisitorPhoto,
  type VisitorPayload,
} from '../api/mutations';

export default function MehmonFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const visitorId = Number(id);
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const createMut = useCreateVisitor();
  const updateMut = useUpdateVisitor(visitorId);

  const [legalName, setLegalName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [jobPosition, setJobPosition] = useState('');
  const [telegram, setTelegram] = useState('');
  const [phone, setPhone] = useState('');
  const [validFrom, setValidFrom] = useState<string>(dayjs().toISOString());
  const [validUntil, setValidUntil] = useState<string>(dayjs().add(1, 'day').toISOString());
  const [picker, setPicker] = useState<null | 'from' | 'until'>(null);
  const [photoBase64, setPhotoBase64] = useState('');   // new picked photo (data URI) to upload
  const [photoPreview, setPhotoPreview] = useState('');  // uri shown in the avatar
  const [existingPhoto, setExistingPhoto] = useState(''); // current server photo (edit)
  const [photoChecking, setPhotoChecking] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const data = await getVisitor(visitorId);
        setLegalName(data.legal_name ?? '');
        setOrgName(data.organization_name ?? '');
        setJobPosition(data.job_position ?? '');
        setTelegram(data.telegram_username ?? '');
        setPhone(data.phone_number ?? '');
        if (data.valid_from) setValidFrom(data.valid_from);
        if (data.valid_until) setValidUntil(data.valid_until);
        if (data.photo_path) { setPhotoPreview(data.photo_path); setExistingPhoto(data.photo_path); }
      } catch {} finally {
        setHydrating(false);
      }
    })();
  }, [isEdit, visitorId]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Ruxsat kerak', 'Rasm tanlash uchun galereyaga ruxsat bering.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    const asset = res.assets[0];
    setPhotoPreview(asset.uri);
    setPhotoBase64(`data:image/png;base64,${asset.base64}`);
    // Terminal face-check (best-effort) — mirrors the web guest form.
    setPhotoChecking(true);
    try {
      const { accepted, message } = await validateVisitorPhoto(asset.base64!);
      if (!accepted) {
        Alert.alert('Rasm qabul qilinmadi', message || 'Terminal yuzni tanimadi. Boshqa rasm tanlang.');
        setPhotoBase64('');
        setPhotoPreview(existingPhoto);
      }
    } catch {} finally {
      setPhotoChecking(false);
    }
  };

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
    const payload: VisitorPayload = {
      legal_name: legalName.trim(),
      organization_name: orgName.trim(),
      job_position: jobPosition.trim(),
      telegram_username: telegram.trim().replace(/^@/, ''),
      phone_number: phone.trim(),
      valid_from: validFrom,
      valid_until: validUntil,
    };
    if (!isEdit && orgBranchId) payload.organization_branch_id = orgBranchId;
    if (photoBase64) payload.photo_base64 = photoBase64; // only send when a new photo is picked
    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload);
        router.back();
      } else {
        const res = await createMut.mutateAsync(payload);
        // Open the new guest's detail so the auto-generated QR is shown immediately.
        const newId = (res as any)?.id;
        if (newId) router.replace({ pathname: '/mehmon-detail', params: { id: newId } } as any);
        else router.back();
      }
    } catch (e) {
      Alert.alert('Xatolik', getApiErrorMessage(e, "Saqlashda xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={isEdit ? 'Mehmonni tahrirlash' : "Yangi mehmon"} />
      {hydrating ? (
        <LoadingView />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Rasm */}
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoCircle} onPress={pickPhoto} activeOpacity={0.8}>
              {photoPreview ? (
                <Image source={{ uri: photoPreview }} style={styles.photoImg} />
              ) : (
                <Icon name="user" size={34} color={colors.textMuted} />
              )}
              {photoChecking && (
                <View style={styles.photoLoading}><ActivityIndicator color={colors.onPrimary} /></View>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} activeOpacity={0.8}>
                <Icon name="edit" size={15} color={colors.text} />
                <Text style={styles.photoBtnText}>{photoPreview ? 'Rasmni almashtirish' : 'Rasm yuklash'}</Text>
              </TouchableOpacity>
              <Text style={styles.photoHint}>Rasm bo'lsa, terminal yuzni tanib kiritadi. Bo'lmasa — QR orqali.</Text>
            </View>
          </View>

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
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
    photoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    photoImg: { width: 80, height: 80, borderRadius: 40 },
    photoLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
    photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
    photoBtnText: { fontSize: 13, fontWeight: '700', color: c.text },
    photoHint: { fontSize: 11, color: c.textMuted, marginTop: 8 },

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
