import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import * as DocumentPicker from 'expo-document-picker';
import { ORDER_ACTS, ORDER_ACT_CATEGORIES, ORDER_ACT_DOCUMENTS, EMPLOYEES_LIST, DEPARTMENTS_LIST, ORGANIZATION_BRANCH_LEADERS } from '../src/api/urls';
import { fetchAllEmployees } from '../src/utils/employees';
import { isHR, employeeSubLabel, translateCategory } from '../src/utils/roles';
import { PickerModal, type PickerOption } from '../src/components/PickerModal';
import { AttachmentField, type PickedFile } from '../src/components/AttachmentField';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import type { Employee, OrderActCategory } from '../src/types';
import { Icon } from '../src/components/Icon';

type Approver = { employee_id: number; can_edit_document: boolean };
type PickerKind = 'category' | 'leadership' | 'submitter' | 'familiarizers' | null;

export default function CreateOrderScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const branchId =
    employee?.organization_branches?.[0]?.id ??
    employee?.department?.organization_branch_id;
  const hr = isHR(user);
  const creatorRole = hr ? 'hr' : 'employee';

  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const qc = useQueryClient();

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [leadershipId, setLeadershipId] = useState<number | null>(null);
  const [submitterId, setSubmitterId] = useState<number | null>(null);
  const [familiarizerDeptIds, setFamiliarizerDeptIds] = useState<number[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [saving, setSaving] = useState(false);

  const pickFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    setFiles((p) => [...p, ...res.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType }))]);
  };

  const [picker, setPicker] = useState<PickerKind>(null);
  const [approverPickerIndex, setApproverPickerIndex] = useState<number | null>(null);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: categories = [], isLoading: catsLoading } = useQuery<OrderActCategory[]>({
    queryKey: ['order-act-categories', creatorRole],
    queryFn: () =>
      apiClient.get(ORDER_ACT_CATEGORIES, { params: { creator_role: creatorRole } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: empData, isLoading: empsLoading } = useQuery({
    queryKey: ['create-order-employees', branchId],
    queryFn: () => fetchAllEmployees(branchId),
    staleTime: 5 * 60 * 1000,
  });
  const employees = empData?.items ?? [];

  const { data: departments = [], isLoading: deptsLoading } = useQuery<any[]>({
    queryKey: ['departments', branchId],
    queryFn: () =>
      apiClient.get(DEPARTMENTS_LIST, { params: branchId ? { organization_branch_id: branchId } : {} })
        .then((r) => { const d = r.data; return Array.isArray(d) ? d : (d?.items ?? []); }),
    staleTime: 5 * 60 * 1000,
  });

  // Rahbariyat (leadership) — barcha buyruqlar uchun kerak (web bilan bir xil).
  // 1) Filialga belgilangan rahbarlar bo'lsa — shular. 2) Aks holda: "raisi"
  //    lavozimidagilar + ministr roli (maslahatchilar chiqarib tashlanadi).
  const { data: leadership = [], isLoading: leadershipLoading } = useQuery<Employee[]>({
    queryKey: ['order-leadership', branchId],
    enabled: !!branchId,
    queryFn: async () => {
      if (branchId) {
        const branchLeaders = await apiClient.get(ORGANIZATION_BRANCH_LEADERS(branchId))
          .then((r) => (Array.isArray(r.data) ? r.data : []).map((l: any) => l.employee).filter(Boolean) as Employee[])
          .catch(() => [] as Employee[]);
        if (branchLeaders.length) return branchLeaders;
      }
      const [raisiRes, ministrRes] = await Promise.all([
        apiClient.get(EMPLOYEES_LIST, {
          params: { job_position_name_search: 'raisi', size: 50, ...(branchId ? { organization_branch_id: branchId } : {}) },
        }).then((r) => { const d = r.data; return Array.isArray(d) ? d : (d?.items ?? []); }),
        apiClient.get(EMPLOYEES_LIST, {
          params: { multi_org_employee_role: 'ministr', size: 10 },
        }).then((r) => { const d = r.data; return Array.isArray(d) ? d : (d?.items ?? []); }).catch(() => []),
      ]);
      const base = (raisiRes as Employee[]).filter((e) => {
        const pos = (typeof e.job_position === 'object' ? e.job_position?.name : (e.job_position as any)) || '';
        return !pos.toLowerCase().includes('maslahatch');
      });
      const ids = new Set(base.map((e) => e.id));
      (ministrRes as Employee[]).forEach((e) => { if (!ids.has(e.id)) base.push(e); });
      return base;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Options ──────────────────────────────────────────────────────────────────
  const empOption = (e: Employee): PickerOption => ({
    value: e.id, label: e.legal_name || "Noma'lum", subLabel: employeeSubLabel(e), photo: e.photo_path ?? null,
  });
  const employeeOptions = useMemo(() => employees.map(empOption), [employees]);
  const leadershipOptions = useMemo(() => leadership.map(empOption), [leadership]);
  const categoryOptions = useMemo<PickerOption[]>(
    () => categories.map((c) => ({ value: c.id, label: translateCategory(c.name) })),
    [categories]
  );
  const departmentOptions = useMemo<PickerOption[]>(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments]
  );

  const nameOf = (id: number | null, opts: PickerOption[]) => opts.find((o) => o.value === id)?.label;

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!categoryId) { Alert.alert('Xato', 'Buyruq turi tanlanishi shart'); return; }
    if (!description.trim()) { Alert.alert('Xato', 'Buyruq matni kiritilishi shart'); return; }
    if (!leadershipId) { Alert.alert('Xato', 'Rahbariyatdan biri tanlanishi shart'); return; }
    if (!branchId) { Alert.alert('Xato', 'Filial aniqlanmadi'); return; }

    const assigned_signers = [
      ...approvers
        .filter((a) => a.employee_id)
        .map((a) => ({ employee_id: a.employee_id, signer_type: 'approver', can_edit_document: a.can_edit_document })),
      ...(leadershipId ? [{ employee_id: leadershipId, signer_type: 'leadership', can_edit_document: false }] : []),
    ];

    const payload = {
      category_id: categoryId,
      summary: summary.trim() || null,
      description: description.trim(),
      submitter_id: submitterId || null,
      familiarizer_department_ids: familiarizerDeptIds,
      assigned_signers,
      organization_branch_id: branchId,
    };

    setSaving(true);
    try {
      const res = await apiClient.post(ORDER_ACTS, payload);
      const orderId = res.data.id;
      if (files.length) {
        const fd = new FormData();
        files.forEach((f) => fd.append('files', { uri: f.uri, name: f.name, type: f.mimeType || 'application/octet-stream' } as any));
        try {
          await apiClient.post(ORDER_ACT_DOCUMENTS(orderId), fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch {
          Alert.alert('Eslatma', "Buyruq saqlandi, lekin ba'zi fayllar yuklanmadi");
        }
      }
      qc.invalidateQueries({ queryKey: ['order-acts'] });
      router.replace({ pathname: '/order-detail', params: { id: String(orderId) } });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.msg : (detail || err?.message || 'Xatolik yuz berdi');
      Alert.alert('Xato', String(msg));
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Yangi buyruq</Text>
          <Text style={styles.subtitle}>{hr ? "Kadr buyrug'i" : "Xodim buyrug'i"}</Text>
        </View>
        <TouchableOpacity
          style={[styles.createBtn, saving && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.createBtnText}>Yaratish</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Buyruq turlari */}
        <Field label="Buyruq turlari" required>
          <Selector
            styles={styles} loading={catsLoading}
            text={nameOf(categoryId, categoryOptions)}
            placeholder="Tanlang..."
            onPress={() => setPicker('category')}
          />
        </Field>

        {/* Qisqacha mazmuni */}
        <Field label="Qisqacha mazmuni">
          <TextInput
            style={styles.textArea} placeholder="Buyruqning qisqacha mazmuni..."
            placeholderTextColor={colors.textMuted} value={summary} onChangeText={setSummary}
            multiline textAlignVertical="top"
          />
        </Field>

        {/* Buyruq matni */}
        <Field label="Buyruq matni" required>
          <TextInput
            style={[styles.textArea, { minHeight: 120 }]} placeholder="Buyruq to'liq matni..."
            placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription}
            multiline textAlignVertical="top"
          />
        </Field>

        {/* Rahbariyat — faqat HR */}
        {hr && (
          <Field label="Rahbariyat" required>
            <Selector
              styles={styles} loading={leadershipLoading}
              text={nameOf(leadershipId, leadershipOptions)}
              placeholder="Rahbarni tanlang..."
              onPress={() => setPicker('leadership')}
            />
          </Field>
        )}

        {/* Kirituvchi shaxs */}
        <Field label="Kirituvchi shaxs">
          <Selector
            styles={styles} loading={empsLoading}
            text={nameOf(submitterId, employeeOptions)}
            placeholder="Tanlang..."
            onPress={() => setPicker('submitter')}
            onClear={submitterId ? () => setSubmitterId(null) : undefined}
          />
        </Field>

        {/* Ilova (fayllar) */}
        <AttachmentField files={files} onPick={pickFiles} onRemove={(i) => setFiles((p) => p.filter((_, idx) => idx !== i))} />

        {/* Buyruq bilan tanishuvchilar (bo'limlar) */}
        <Field label="Buyruq bilan tanishuvchilar">
          <Selector
            styles={styles} loading={deptsLoading}
            text={familiarizerDeptIds.length ? `${familiarizerDeptIds.length} ta bo'lim tanlandi` : undefined}
            placeholder="Bo'limlarni tanlang..."
            onPress={() => setPicker('familiarizers')}
          />
        </Field>

        {/* Kelishuvchilar (approvers) */}
        <View style={styles.approversHead}>
          <Text style={styles.fieldLabel}>Kelishuvchilar</Text>
          <TouchableOpacity
            style={styles.addApproverBtn}
            onPress={() => setApprovers((p) => [...p, { employee_id: 0, can_edit_document: false }])}
            activeOpacity={0.8}
          >
            <Icon name="plus" size={14} color={colors.primary} />
            <Text style={styles.addApproverText}>Qo'shish</Text>
          </TouchableOpacity>
        </View>

        {approvers.length === 0 ? (
          <Text style={styles.emptyApprovers}>Kelishuvchilar qo'shilmagan</Text>
        ) : (
          approvers.map((a, idx) => (
            <View key={idx} style={styles.approverCard}>
              <View style={styles.approverRow}>
                <View style={{ flex: 1 }}>
                  <Selector
                    styles={styles} loading={empsLoading}
                    text={nameOf(a.employee_id || null, employeeOptions)}
                    placeholder="FIO yoki lavozim"
                    onPress={() => { setApproverPickerIndex(idx); }}
                  />
                </View>
                <TouchableOpacity
                  style={styles.removeApprover}
                  onPress={() => setApprovers((p) => p.filter((_, i) => i !== idx))}
                  hitSlop={6}
                >
                  <Icon name="close" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
              <View style={styles.editRow}>
                <Text style={styles.editLabel}>Buyruqni tahrirlash huquqi</Text>
                <Switch
                  value={a.can_edit_document}
                  onValueChange={(v) =>
                    setApprovers((p) => p.map((x, i) => (i === idx ? { ...x, can_edit_document: v } : x)))
                  }
                  trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Pickers */}
      <PickerModal
        visible={picker === 'category'} title="Buyruq turlari" options={categoryOptions}
        loading={catsLoading} selected={categoryId}
        onClose={() => setPicker(null)}
        onSelect={(v) => { setCategoryId(v); setPicker(null); }}
      />
      <PickerModal
        visible={picker === 'leadership'} title="Rahbariyat" options={leadershipOptions}
        loading={leadershipLoading} selected={leadershipId}
        onClose={() => setPicker(null)}
        onSelect={(v) => { setLeadershipId(v); setPicker(null); }}
      />
      <PickerModal
        visible={picker === 'submitter'} title="Kirituvchi shaxs" options={employeeOptions}
        loading={empsLoading} selected={submitterId}
        onClose={() => setPicker(null)}
        onSelect={(v) => { setSubmitterId(v); setPicker(null); }}
      />
      <PickerModal
        visible={picker === 'familiarizers'} title="Tanishuvchi bo'limlar" options={departmentOptions}
        loading={deptsLoading} multiple selected={familiarizerDeptIds}
        onClose={() => setPicker(null)}
        onSelect={() => {}}
        onToggle={(v) =>
          setFamiliarizerDeptIds((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))
        }
      />
      <PickerModal
        visible={approverPickerIndex !== null} title="Kelishuvchi" options={employeeOptions}
        loading={empsLoading}
        selected={approverPickerIndex !== null ? approvers[approverPickerIndex]?.employee_id ?? null : null}
        onClose={() => setApproverPickerIndex(null)}
        onSelect={(v) => {
          setApprovers((p) => p.map((x, i) => (i === approverPickerIndex ? { ...x, employee_id: v } : x)));
          setApproverPickerIndex(null);
        }}
      />
    </SafeAreaView>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.req}> *</Text> : null}</Text>
      {children}
    </View>
  );
}

function Selector({
  styles, text, placeholder, loading, onPress, onClear,
}: { styles: any; text?: string; placeholder: string; loading?: boolean; onPress: () => void; onClear?: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.selector} onPress={onPress} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : (
        <Text style={text ? styles.selectorText : styles.selectorPlaceholder} numberOfLines={1}>
          {text ?? placeholder}
        </Text>
      )}
      {onClear ? (
        <TouchableOpacity onPress={onClear} hitSlop={10}><Icon name="close" size={16} color={colors.textMuted} /></TouchableOpacity>
      ) : (
        <Icon name="chevronRight" size={20} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 24, color: c.text },
    title: { fontSize: 19, fontWeight: '800', color: c.text },
    subtitle: { fontSize: 12, color: c.textMuted, marginTop: 1 },
    createBtn: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, minWidth: 84, alignItems: 'center' },
    createBtnDisabled: { opacity: 0.6 },
    createBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 14 },

    content: { paddingHorizontal: 16, paddingTop: 4 },

    field: { marginTop: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary, marginBottom: 8 },
    req: { color: c.error },

    selector: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 13, gap: 8 },
    selectorText: { flex: 1, fontSize: 14, color: c.text, fontWeight: '500' },
    selectorPlaceholder: { flex: 1, fontSize: 14, color: c.textMuted },
    selectorArrow: { fontSize: 20, color: c.textMuted },

    textArea: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, minHeight: 80 },

    approversHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 8 },
    addApproverBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.primarySoft, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14 },
    addApproverText: { color: c.primary, fontSize: 12, fontWeight: '700' },
    emptyApprovers: { color: c.textMuted, fontSize: 13 },

    approverCard: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, padding: 10, marginBottom: 8, gap: 8 },
    approverRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    removeApprover: { width: 40, height: 44, backgroundColor: c.errorSoft, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    removeApproverText: { color: c.error, fontSize: 15, fontWeight: '700' },
    editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
    editLabel: { fontSize: 12, color: c.textSecondary },
  });
