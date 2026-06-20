import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { EMPLOYEE_DETAIL, EMPLOYEE_SELF_UPDATE, USER_INFO } from '../src/api/urls';
import { useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { EmployeeFull, User } from '../src/types';

const MARITAL_OPTIONS = [
  { key: 'single', label: 'Turmush qurmagan' },
  { key: 'married', label: 'Turmush qurgan' },
  { key: 'divorced', label: 'Ajrashgan' },
  { key: 'widowed', label: 'Beva' },
];

type Form = {
  legal_name: string;
  phone_number: string;
  internal_phone_number: string;
  address: string;
  maritial_status: string;
  pasport_series: string;
  pasport_number: string;
  pasport_issue_by: string;
  pasport_individual_number: string;
  personal_identification_number: string;
  taxpayer_identification_number: string;
  individual_accumulative_pension_account_number: string;
};

const EMPTY: Form = {
  legal_name: '', phone_number: '', internal_phone_number: '', address: '',
  maritial_status: '', pasport_series: '', pasport_number: '', pasport_issue_by: '',
  pasport_individual_number: '', personal_identification_number: '',
  taxpayer_identification_number: '', individual_accumulative_pension_account_number: '',
};

export default function ProfileEditScreen() {
  const { user, setUser } = useAuthStore();
  const employeeId = user?.employee?.id;
  const styles = useThemedStyles(makeStyles);

  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!employeeId) { setLoading(false); return; }
    (async () => {
      try {
        const res = await apiClient.get<EmployeeFull>(EMPLOYEE_DETAIL(employeeId));
        const e = res.data;
        setForm({
          legal_name: e.legal_name ?? '',
          phone_number: e.phone_number ?? '',
          internal_phone_number: e.internal_phone_number ?? '',
          address: e.address ?? '',
          maritial_status: e.maritial_status ?? '',
          pasport_series: e.pasport_series ?? '',
          pasport_number: e.pasport_number ?? '',
          pasport_issue_by: e.pasport_issue_by ?? '',
          pasport_individual_number: e.pasport_individual_number ?? '',
          personal_identification_number: e.personal_identification_number ?? '',
          taxpayer_identification_number: e.taxpayer_identification_number ?? '',
          individual_accumulative_pension_account_number: e.individual_accumulative_pension_account_number ?? '',
        });
      } catch {}
      finally { setLoading(false); }
    })();
  }, [employeeId]);

  const set = (k: keyof Form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.legal_name.trim()) {
      Alert.alert('Xato', 'F.I.O. kiritilishi shart');
      return;
    }
    setSaving(true);
    try {
      // Send only non-empty values so we never wipe existing data with blanks.
      const payload: Record<string, string> = {};
      (Object.keys(form) as (keyof Form)[]).forEach((k) => {
        const val = form[k]?.trim?.() ?? form[k];
        if (val) payload[k] = val;
      });

      await apiClient.patch(EMPLOYEE_SELF_UPDATE, payload);

      // Refresh the cached user so changes show immediately everywhere.
      try {
        const me = await apiClient.get<User>(USER_INFO);
        setUser(me.data);
      } catch {}

      Alert.alert('Saqlandi', "Ma'lumotlar yangilandi", [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.msg : (detail || 'Saqlashda xatolik');
      Alert.alert('Xatolik', typeof msg === 'string' ? msg : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator color={styles._spinner.color} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ma'lumotlarni o'zgartirish</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.noteText}>
            🔒 Ish ma'lumotlari (bo'lim, lavozim, ish vaqti) faqat kadrlar bo'limi tomonidan o'zgartiriladi.
          </Text>

          <Card styles={styles} title="Shaxsiy">
            <Field styles={styles} label="F.I.O." value={form.legal_name} onChange={set('legal_name')} />
            <Field styles={styles} label="Manzil" value={form.address} onChange={set('address')} multiline />
            <View>
              <Text style={styles.label}>Oilaviy holati</Text>
              <View style={styles.chipsRow}>
                {MARITAL_OPTIONS.map((opt) => {
                  const active = form.maritial_status === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => set('maritial_status')(opt.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Card>

          <Card styles={styles} title="Kontakt">
            <Field styles={styles} label="Telefon" value={form.phone_number} onChange={set('phone_number')} keyboardType="phone-pad" />
            <Field styles={styles} label="Ichki telefon" value={form.internal_phone_number} onChange={set('internal_phone_number')} keyboardType="phone-pad" />
          </Card>

          <Card styles={styles} title="Hujjatlar">
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field styles={styles} label="Pasport seriya" value={form.pasport_series} onChange={set('pasport_series')} autoCapitalize="characters" />
              </View>
              <View style={{ flex: 1.4 }}>
                <Field styles={styles} label="Pasport raqami" value={form.pasport_number} onChange={set('pasport_number')} keyboardType="number-pad" />
              </View>
            </View>
            <Field styles={styles} label="Pasport berilgan joy" value={form.pasport_issue_by} onChange={set('pasport_issue_by')} />
            <Field styles={styles} label="JSHIR" value={form.pasport_individual_number} onChange={set('pasport_individual_number')} keyboardType="number-pad" />
            <Field styles={styles} label="PINFL" value={form.personal_identification_number} onChange={set('personal_identification_number')} keyboardType="number-pad" />
            <Field styles={styles} label="INN" value={form.taxpayer_identification_number} onChange={set('taxpayer_identification_number')} keyboardType="number-pad" />
            <Field styles={styles} label="Pensiya hisob raqami" value={form.individual_accumulative_pension_account_number} onChange={set('individual_accumulative_pension_account_number')} keyboardType="number-pad" />
          </Card>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color={styles._onPrimary.color} /> : <Text style={styles.saveBtnText}>Saqlash</Text>}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Card({ styles, title, children }: { styles: any; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={{ gap: 14 }}>{children}</View>
    </View>
  );
}

function Field({
  styles, label, value, onChange, keyboardType, multiline, autoCapitalize,
}: {
  styles: any; label: string; value: string; onChange: (v: string) => void;
  keyboardType?: any; multiline?: boolean; autoCapitalize?: any;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor={styles._placeholder.color}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    _spinner: { color: c.primaryLight },
    _placeholder: { color: c.textMuted },
    _onPrimary: { color: c.onPrimary },
    loadingWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    backArrow: { fontSize: 22, color: c.text, fontWeight: '300' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },

    content: { paddingHorizontal: 16, paddingTop: 16 },
    noteText: { fontSize: 12, color: c.textMuted, marginBottom: 14, lineHeight: 17 },

    card: {
      backgroundColor: c.card, borderRadius: 18, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: c.cardBorder,
    },
    cardTitle: { fontSize: 13, fontWeight: '800', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },

    label: { fontSize: 12, fontWeight: '600', color: c.textSecondary, marginBottom: 6 },
    input: {
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text,
    },
    inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
    row2: { flexDirection: 'row', gap: 12 },

    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder,
    },
    chipActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    chipText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    chipTextActive: { color: c.primaryLight, fontWeight: '700' },

    saveBtn: {
      backgroundColor: c.primary, borderRadius: 14, paddingVertical: 16,
      alignItems: 'center', marginTop: 4,
    },
    saveBtnText: { color: c.onPrimary, fontSize: 16, fontWeight: '700' },
  });
