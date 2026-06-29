import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import * as DocumentPicker from 'expo-document-picker';
import { LETTER_CREATE, LETTER_UPLOAD_ATTACHMENT, EMPLOYEES_LIST, ORGANIZATION_BRANCHES, ORGANIZATION_BRANCH_LEADERS } from '../src/api/urls';
import { fetchAllEmployees } from '../src/utils/employees';
import { employeeSubLabel } from '../src/utils/roles';
import { PickerModal, type PickerOption } from '../src/components/PickerModal';
import { AttachmentField, type PickedFile } from '../src/components/AttachmentField';
import { DatePickerModal } from '../src/components/DatePicker';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import type { Employee } from '../src/types';
import { Icon } from '../src/components/Icon';

type LetterType = 'explanatory' | 'application' | 'business_trip';
const TYPE_OPTIONS: PickerOption[] = [
  { value: 1, label: 'Bildirgi' },
  { value: 2, label: 'Ariza' },
  { value: 3, label: 'Xizmat safari' },
];
const TYPE_BY_VALUE: Record<number, LetterType> = { 1: 'explanatory', 2: 'application', 3: 'business_trip' };
const VALUE_BY_TYPE: Record<LetterType, number> = { explanatory: 1, application: 2, business_trip: 3 };

type PickerKind =
  | 'type' | 'main' | 'ordinary' | 'submitter' | 'rahbariyat' | 'regions' | 'destinations' | null;
type DateKind = 'letter' | 'departure' | 'arrival' | null;

export default function CreateLetterScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const branchId =
    employee?.organization_branches?.[0]?.id ??
    employee?.department?.organization_branch_id;

  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const qc = useQueryClient();

  const [letterType, setLetterType] = useState<LetterType | null>(null);
  const [letterDate, setLetterDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [shortSummary, setShortSummary] = useState('');
  const [description, setDescription] = useState('');
  const [workPlan, setWorkPlan] = useState('');
  const [mainSignerId, setMainSignerId] = useState<number | null>(null);
  const [ordinarySigners, setOrdinarySigners] = useState<number[]>([]);
  // business trip
  const [departureDate, setDepartureDate] = useState<string | null>(null);
  const [arrivalDate, setArrivalDate] = useState<string | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [destinationIds, setDestinationIds] = useState<number[]>([]);
  const [submitterId, setSubmitterId] = useState<number | null>(null);
  const [rahbariyatIds, setRahbariyatIds] = useState<number[]>([]);

  const [picker, setPicker] = useState<PickerKind>(null);
  const [datePicker, setDatePicker] = useState<DateKind>(null);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [saving, setSaving] = useState(false);

  const isTrip = letterType === 'business_trip';

  const pickFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setFiles([{ uri: a.uri, name: a.name, mimeType: a.mimeType }]); // single attachment (web parity)
  };

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: signerEmps = [], isLoading: signersLoading } = useQuery<Employee[]>({
    queryKey: ['letter-signers', branchId],
    queryFn: () =>
      apiClient.get(EMPLOYEES_LIST, {
        params: { multi_org_employee_role: ['hr', 'deputy', 'ministr'], include_multi_org: true, size: 100, ...(branchId ? { organization_branch_id: branchId } : {}) },
      }).then((r) => { const d = r.data; return Array.isArray(d) ? d : (d?.items ?? []); }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: rahbariyatEmps = [], isLoading: rahbariyatLoading } = useQuery<Employee[]>({
    queryKey: ['letter-rahbariyat', branchId],
    enabled: isTrip,
    queryFn: async () => {
      // Prefer the filial's designated leaders (like web); fallback to deputy/ministr.
      if (branchId) {
        const branchLeaders = await apiClient.get(ORGANIZATION_BRANCH_LEADERS(branchId))
          .then((r) => (Array.isArray(r.data) ? r.data : []).map((l: any) => l.employee).filter(Boolean) as Employee[])
          .catch(() => [] as Employee[]);
        if (branchLeaders.length) return branchLeaders;
      }
      return apiClient.get(EMPLOYEES_LIST, {
        params: { multi_org_employee_role: ['deputy', 'ministr'], include_multi_org: true, size: 100, ...(branchId ? { organization_branch_id: branchId } : {}) },
      }).then((r) => { const d = r.data; return (Array.isArray(d) ? d : (d?.items ?? [])) as Employee[]; });
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: submitterData, isLoading: submittersLoading } = useQuery({
    queryKey: ['letter-submitters', branchId],
    enabled: isTrip,
    queryFn: () => fetchAllEmployees(branchId),
    staleTime: 5 * 60 * 1000,
  });
  const submitterEmps = submitterData?.items ?? [];

  const { data: branches = [], isLoading: branchesLoading } = useQuery<any[]>({
    queryKey: ['org-branches'],
    enabled: isTrip,
    queryFn: () =>
      apiClient.get(ORGANIZATION_BRANCHES).then((r) => { const d = r.data; return Array.isArray(d) ? d : (d?.items ?? []); }),
    staleTime: 10 * 60 * 1000,
  });

  // ── Options ──────────────────────────────────────────────────────────────────
  const empOption = (e: Employee): PickerOption => ({ value: e.id, label: e.legal_name || "Noma'lum", subLabel: employeeSubLabel(e), photo: e.photo_path ?? null });
  const signerOptions = useMemo(() => signerEmps.map(empOption), [signerEmps]);
  const ordinaryOptions = useMemo(() => signerOptions.filter((o) => o.value !== mainSignerId), [signerOptions, mainSignerId]);
  const rahbariyatOptions = useMemo(() => rahbariyatEmps.map(empOption), [rahbariyatEmps]);
  const submitterOptions = useMemo(() => submitterEmps.map(empOption), [submitterEmps]);

  const regionOptions = useMemo<PickerOption[]>(() => {
    const set = Array.from(new Set(branches.map((b) => b.region).filter(Boolean)));
    return set.map((r, i) => ({ value: i + 1, label: String(r) }));
  }, [branches]);
  const regionLabelByValue = (v: number) => regionOptions.find((o) => o.value === v)?.label;

  const destinationOptions = useMemo<PickerOption[]>(() => {
    return branches
      .filter((b) => regions.length === 0 || regions.includes(b.region))
      .map((b) => ({ value: b.id, label: b.name, subLabel: b.region }));
  }, [branches, regions]);

  const nameOf = (id: number | null, opts: PickerOption[]) => opts.find((o) => o.value === id)?.label;

  // regions stored as string[]; map via region option values
  const selectedRegionValues = useMemo(
    () => regionOptions.filter((o) => regions.includes(o.label)).map((o) => o.value),
    [regionOptions, regions]
  );

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!letterType) { Alert.alert('Xato', 'Hujjat turi tanlanishi shart'); return; }
    if (!branchId) { Alert.alert('Xato', 'Filial aniqlanmadi'); return; }
    if (!isTrip && !mainSignerId) { Alert.alert('Xato', 'Rahbariyat (imzolovchi) tanlanishi shart'); return; }
    if (isTrip) {
      if (destinationIds.length === 0) { Alert.alert('Xato', 'Kamida bitta borish filiali tanlanishi shart'); return; }
      if (!submitterId) { Alert.alert('Xato', 'Yuboruvchi shaxs tanlanishi shart'); return; }
      if (rahbariyatIds.length === 0) { Alert.alert('Xato', 'Kamida bitta rahbariyat tanlanishi shart'); return; }
    }

    const desc = isTrip
      ? (description.trim() || null)
      : ([shortSummary.trim(), description.trim()].filter(Boolean).join('\n\n') || null);

    const payload: Record<string, any> = {
      letter_type: letterType,
      letter_date: letterDate || null,
      description: desc,
      organization_branch_id: branchId,
      employee_id: employee?.id,
    };

    if (isTrip) {
      payload.destination_branch_ids = destinationIds;
      payload.submitter_id = submitterId;
      payload.rahbariyat_ids = rahbariyatIds;
      payload.departure_date = departureDate || null;
      payload.arrival_date = arrivalDate || null;
      payload.work_plan = workPlan.trim() || null;
    } else {
      payload.assigned_signers = [
        ...(mainSignerId ? [{ employee_id: mainSignerId, signer_type: 'main' }] : []),
        ...ordinarySigners.filter((id) => id && id !== mainSignerId).map((id) => ({ employee_id: id, signer_type: 'ordinary' })),
      ];
    }

    setSaving(true);
    try {
      const res = await apiClient.post(LETTER_CREATE, payload);
      const letterId = res.data.id;
      if (files.length) {
        const fd = new FormData();
        fd.append('file', { uri: files[0].uri, name: files[0].name, type: files[0].mimeType || 'application/octet-stream' } as any);
        try {
          await apiClient.post(LETTER_UPLOAD_ATTACHMENT(letterId), fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch {
          Alert.alert('Eslatma', 'Xat saqlandi, lekin ilova yuklanmadi');
        }
      }
      qc.invalidateQueries({ queryKey: ['letters'] });
      router.replace({ pathname: '/letter-detail', params: { id: letterId } } as any);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.msg : (detail || err?.message || 'Xatolik yuz berdi');
      Alert.alert('Xato', String(msg));
    } finally {
      setSaving(false);
    }
  }

  const typeHint = !letterType ? '' :
    letterType === 'application' ? 'Ariza: barcha kelishuvchilar va rahbar imzolashi shart. Biror kishi rad etsa — hujjat bekor.' :
    isTrip ? "Xizmat safari: rahbar tasdiqlagach, xat borish filiali HR akkountida ko'rinadi." :
    'Bildirgi: faqat rahbar imzosi majburiy. Kelishuvchilar ixtiyoriy.';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Yangi xat</Text>
        <TouchableOpacity style={[styles.createBtn, saving && styles.createBtnDisabled]} onPress={handleCreate} disabled={saving} activeOpacity={0.8}>
          {saving ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.createBtnText}>Yaratish</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field styles={styles} label="Hujjat turi" required>
          <Selector styles={styles} text={letterType ? TYPE_OPTIONS.find((o) => TYPE_BY_VALUE[o.value] === letterType)?.label : undefined} placeholder="Tanlang..." onPress={() => setPicker('type')} />
        </Field>

        <Field styles={styles} label="Sanasi">
          <Selector styles={styles} text={letterDate ? dayjs(letterDate).format('DD.MM.YYYY') : undefined} placeholder="Sanani tanlang" onPress={() => setDatePicker('letter')} />
        </Field>

        {!!typeHint && <View style={styles.hintBox}><Text style={styles.hintText}>{typeHint}</Text></View>}

        {isTrip ? (
          <>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field styles={styles} label="Borish sanasi">
                  <Selector styles={styles} text={departureDate ? dayjs(departureDate).format('DD.MM.YYYY') : undefined} placeholder="Sana" onPress={() => setDatePicker('departure')} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field styles={styles} label="Kelish sanasi">
                  <Selector styles={styles} text={arrivalDate ? dayjs(arrivalDate).format('DD.MM.YYYY') : undefined} placeholder="Sana" onPress={() => setDatePicker('arrival')} />
                </Field>
              </View>
            </View>

            <Field styles={styles} label="Viloyat(lar)">
              <Selector styles={styles} loading={branchesLoading} text={regions.length ? `${regions.length} ta viloyat` : undefined} placeholder="Viloyatlarni tanlang..." onPress={() => setPicker('regions')} />
            </Field>
            <Field styles={styles} label="Borish filiali(lar)" required>
              <Selector styles={styles} loading={branchesLoading} text={destinationIds.length ? `${destinationIds.length} ta filial` : undefined} placeholder="Filiallarni tanlang..." onPress={() => setPicker('destinations')} />
            </Field>

            <Field styles={styles} label="Borishdan maqsad">
              <TextInput style={[styles.textArea, { minHeight: 100 }]} placeholder="Borishdan maqsad..." placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
            </Field>

            <Field styles={styles} label="Xizmat safari ish rejasi">
              <TextInput style={[styles.textArea, { minHeight: 100 }]} placeholder="Ish rejasi..." placeholderTextColor={colors.textMuted} value={workPlan} onChangeText={setWorkPlan} multiline textAlignVertical="top" />
            </Field>

            <Field styles={styles} label="Rahbariyat (Ministr / Deputy)" required>
              <Selector styles={styles} loading={rahbariyatLoading} text={rahbariyatIds.length ? `${rahbariyatIds.length} ta tanlandi` : undefined} placeholder="Rahbariyatni tanlang..." onPress={() => setPicker('rahbariyat')} />
            </Field>
            <Field styles={styles} label="Yuboruvchi shaxs" required>
              <Selector styles={styles} loading={submittersLoading} text={nameOf(submitterId, submitterOptions)} placeholder="Yuboruvchini tanlang..." onPress={() => setPicker('submitter')} />
            </Field>
          </>
        ) : (
          <>
            <Field styles={styles} label="Qisqa mazmuni">
              <TextInput style={styles.input} placeholder="Qisqa mazmun..." placeholderTextColor={colors.textMuted} value={shortSummary} onChangeText={setShortSummary} />
            </Field>
            <Field styles={styles} label="Matn">
              <TextInput style={[styles.textArea, { minHeight: 140 }]} placeholder="Hujjat matni..." placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
            </Field>
            <Field styles={styles} label="Rahbariyat (imzolovchi)" required>
              <Selector styles={styles} loading={signersLoading} text={nameOf(mainSignerId, signerOptions)} placeholder="Rahbariyatni tanlang..." onPress={() => setPicker('main')} />
            </Field>
            <Field styles={styles} label="Kelishuvchilar">
              <Selector styles={styles} loading={signersLoading} text={ordinarySigners.length ? `${ordinarySigners.length} ta kelishuvchi` : undefined} placeholder="Kelishuvchilarni tanlang..." onPress={() => setPicker('ordinary')} />
            </Field>
          </>
        )}

        {/* Ilova yoki asos */}
        <AttachmentField label="Ilova yoki asos" files={files} onPick={pickFiles} onRemove={() => setFiles([])} />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Pickers */}
      <PickerModal visible={picker === 'type'} title="Hujjat turi" options={TYPE_OPTIONS} selected={letterType ? VALUE_BY_TYPE[letterType] : null}
        onClose={() => setPicker(null)} onSelect={(v) => { setLetterType(TYPE_BY_VALUE[v]); setPicker(null); }} />

      <PickerModal visible={picker === 'main'} title="Rahbariyat (imzolovchi)" options={signerOptions} loading={signersLoading} selected={mainSignerId}
        onClose={() => setPicker(null)} onSelect={(v) => { setMainSignerId(v); setPicker(null); }} />

      <PickerModal visible={picker === 'ordinary'} title="Kelishuvchilar" options={ordinaryOptions} loading={signersLoading} multiple selected={ordinarySigners}
        onClose={() => setPicker(null)} onSelect={() => {}}
        onToggle={(v) => setOrdinarySigners((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))} />

      <PickerModal visible={picker === 'rahbariyat'} title="Rahbariyat" options={rahbariyatOptions} loading={rahbariyatLoading} multiple selected={rahbariyatIds}
        onClose={() => setPicker(null)} onSelect={() => {}}
        onToggle={(v) => setRahbariyatIds((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))} />

      <PickerModal visible={picker === 'submitter'} title="Yuboruvchi shaxs" options={submitterOptions} loading={submittersLoading} selected={submitterId}
        onClose={() => setPicker(null)} onSelect={(v) => { setSubmitterId(v); setPicker(null); }} />

      <PickerModal visible={picker === 'regions'} title="Viloyatlar" options={regionOptions} loading={branchesLoading} multiple selected={selectedRegionValues}
        onClose={() => setPicker(null)} onSelect={() => {}}
        onToggle={(v) => {
          const label = regionLabelByValue(v);
          if (!label) return;
          setRegions((p) => {
            const next = p.includes(label) ? p.filter((x) => x !== label) : [...p, label];
            // prune destinations outside selected regions
            if (next.length > 0) {
              const allowed = branches.filter((b) => next.includes(b.region)).map((b) => b.id);
              setDestinationIds((d) => d.filter((id) => allowed.includes(id)));
            }
            return next;
          });
        }} />

      <PickerModal visible={picker === 'destinations'} title="Borish filiallari" options={destinationOptions} loading={branchesLoading} multiple selected={destinationIds}
        onClose={() => setPicker(null)} onSelect={() => {}}
        onToggle={(v) => setDestinationIds((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))} />

      {/* Date pickers */}
      <DatePickerModal visible={datePicker === 'letter'} value={letterDate} title="Sanasi" onClose={() => setDatePicker(null)} onConfirm={setLetterDate} />
      <DatePickerModal visible={datePicker === 'departure'} value={departureDate} title="Borish sanasi" onClose={() => setDatePicker(null)} onConfirm={setDepartureDate} />
      <DatePickerModal visible={datePicker === 'arrival'} value={arrivalDate} title="Kelish sanasi" onClose={() => setDatePicker(null)} onConfirm={setArrivalDate} />
    </SafeAreaView>
  );
}

function Field({ styles, label, required, children }: { styles: any; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.req}> *</Text> : null}</Text>
      {children}
    </View>
  );
}

function Selector({ styles, text, placeholder, loading, onPress }: { styles: any; text?: string; placeholder: string; loading?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.selector} onPress={onPress} activeOpacity={0.8}>
      {loading ? <ActivityIndicator size="small" color={colors.textMuted} /> : (
        <Text style={text ? styles.selectorText : styles.selectorPlaceholder} numberOfLines={1}>{text ?? placeholder}</Text>
      )}
      <Icon name="chevronRight" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 24, color: c.text },
    title: { flex: 1, fontSize: 19, fontWeight: '800', color: c.text },
    createBtn: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, minWidth: 84, alignItems: 'center' },
    createBtnDisabled: { opacity: 0.6 },
    createBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 14 },
    content: { paddingHorizontal: 16, paddingTop: 4 },
    field: { marginTop: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary, marginBottom: 8 },
    req: { color: c.error },
    row2: { flexDirection: 'row', gap: 12 },
    selector: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 13, gap: 8 },
    selectorText: { flex: 1, fontSize: 14, color: c.text, fontWeight: '500' },
    selectorPlaceholder: { flex: 1, fontSize: 14, color: c.textMuted },
    selectorArrow: { fontSize: 20, color: c.textMuted },
    input: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text },
    textArea: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, minHeight: 100 },
    hintBox: { marginTop: 14, backgroundColor: c.primarySoft, borderRadius: 10, padding: 12 },
    hintText: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
  });
