import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { isHR, employeeSubLabel, translateCategory } from '@/utils/roles';
import { getApiErrorMessage } from '@/api/errors';
import { type PickerOption } from '@/components/PickerModal';
import { AttachmentField, type PickedFile } from '@/components/AttachmentField';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { Employee } from '@/types';
import { Icon } from '@/components/Icon';
import {
  orderCategoriesQuery, orderEmployeesQuery, orderDepartmentsQuery, orderLeadershipQuery,
} from '../api/queries';
import { useCreateOrder } from '../api/mutations';
import { Field, Selector } from '../components/FormParts';
import { ApproversEditor, type Approver } from '../components/ApproversEditor';
import { OrderPickers, type PickerKind } from '../components/OrderPickers';

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
  const { t } = useTranslation();
  const createMutation = useCreateOrder();

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [leadershipId, setLeadershipId] = useState<number | null>(null);
  const [submitterId, setSubmitterId] = useState<number | null>(null);
  const [familiarizerDeptIds, setFamiliarizerDeptIds] = useState<number[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [approverPickerIndex, setApproverPickerIndex] = useState<number | null>(null);

  const pickFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    setFiles((p) => [...p, ...res.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType }))]);
  };

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: categories = [], isLoading: catsLoading } = useQuery(orderCategoriesQuery(creatorRole));
  const { data: empData, isLoading: empsLoading } = useQuery(orderEmployeesQuery(branchId));
  const { data: departments = [], isLoading: deptsLoading } = useQuery(orderDepartmentsQuery(branchId));
  const { data: leadership = [], isLoading: leadershipLoading } = useQuery(orderLeadershipQuery(branchId));

  // ── Options ──────────────────────────────────────────────────────────────────
  const empOption = (e: Employee): PickerOption => ({
    value: e.id, label: e.legal_name || t('status.unknown'), subLabel: employeeSubLabel(e), photo: e.photo_path ?? null,
  });
  const employeeOptions = useMemo(() => (empData?.items ?? []).map(empOption), [empData]);
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
    if (!categoryId) { Alert.alert(t('orders.validationTitle'), t('orders.categoryRequired')); return; }
    if (!description.trim()) { Alert.alert(t('orders.validationTitle'), t('orders.descriptionRequired')); return; }
    // Web parity (AddOrderDrawer, c66c2af) + backend 7b3326f: decree/submit now
    // 400s `approver_required` — without at least one kelishuvchi the decree
    // would skip the agreement/sign stages straight to 'approved'.
    if (!approvers.some((a) => a.employee_id)) { Alert.alert(t('orders.validationTitle'), t('orders.approverRequired')); return; }
    if (!leadershipId) { Alert.alert(t('orders.validationTitle'), t('orders.leadershipRequired')); return; }
    if (!branchId) { Alert.alert(t('orders.validationTitle'), t('orders.branchNotFound')); return; }

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
      const orderId = await createMutation.mutateAsync({
        payload,
        files,
        onFilesError: () => Alert.alert(t('orders.filesPartialTitle'), t('orders.filesPartialMessage')),
      });
      router.replace({ pathname: '/order-detail', params: { id: String(orderId) } });
    } catch (err) {
      Alert.alert(t('orders.validationTitle'), getApiErrorMessage(err, t('errors.generic')));
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
          <Text style={styles.title}>{t('orders.createTitle')}</Text>
          <Text style={styles.subtitle}>{hr ? t('orders.hrSubtitle') : t('orders.employeeSubtitle')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.createBtn, saving && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.createBtnText}>{t('common.create')}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label={t('orders.categoryLabel')} required>
          <Selector
            loading={catsLoading}
            text={nameOf(categoryId, categoryOptions)}
            placeholder={t('orders.selectPlaceholder')}
            onPress={() => setPicker('category')}
          />
        </Field>

        <Field label={t('orders.summaryLabel')}>
          <TextInput
            style={styles.textArea} placeholder={t('orders.summaryPlaceholder')}
            placeholderTextColor={colors.textMuted} value={summary} onChangeText={setSummary}
            multiline textAlignVertical="top"
          />
        </Field>

        <Field label={t('orders.descriptionLabel')} required>
          <TextInput
            style={[styles.textArea, { minHeight: 120 }]} placeholder={t('orders.descriptionPlaceholder')}
            placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription}
            multiline textAlignVertical="top"
          />
        </Field>

        {hr && (
          <Field label={t('orders.leadershipLabel')} required>
            <Selector
              loading={leadershipLoading}
              text={nameOf(leadershipId, leadershipOptions)}
              placeholder={t('orders.leadershipPlaceholder')}
              onPress={() => setPicker('leadership')}
            />
          </Field>
        )}

        <Field label={t('orders.submitterLabel')}>
          <Selector
            loading={empsLoading}
            text={nameOf(submitterId, employeeOptions)}
            placeholder={t('orders.selectPlaceholder')}
            onPress={() => setPicker('submitter')}
            onClear={submitterId ? () => setSubmitterId(null) : undefined}
          />
        </Field>

        <AttachmentField files={files} onPick={pickFiles} onRemove={(i) => setFiles((p) => p.filter((_, idx) => idx !== i))} />

        <Field label={t('orders.familiarizersLabel')}>
          <Selector
            loading={deptsLoading}
            text={familiarizerDeptIds.length ? t('orders.deptsSelected', { count: familiarizerDeptIds.length }) : undefined}
            placeholder={t('orders.familiarizersPlaceholder')}
            onPress={() => setPicker('familiarizers')}
          />
        </Field>

        <ApproversEditor
          approvers={approvers}
          employeesLoading={empsLoading}
          nameFor={(id) => nameOf(id, employeeOptions)}
          onAdd={() => setApprovers((p) => [...p, { employee_id: 0, can_edit_document: false }])}
          onRemove={(i) => setApprovers((p) => p.filter((_, idx) => idx !== i))}
          onPick={(i) => setApproverPickerIndex(i)}
          onToggleEdit={(i, v) => setApprovers((p) => p.map((x, idx) => (idx === i ? { ...x, can_edit_document: v } : x)))}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      <OrderPickers
        picker={picker}
        onClosePicker={() => setPicker(null)}
        approverPickerIndex={approverPickerIndex}
        onCloseApproverPicker={() => setApproverPickerIndex(null)}
        categoryOptions={categoryOptions} categoryId={categoryId} catsLoading={catsLoading}
        onSelectCategory={(v) => { setCategoryId(v); setPicker(null); }}
        leadershipOptions={leadershipOptions} leadershipId={leadershipId} leadershipLoading={leadershipLoading}
        onSelectLeadership={(v) => { setLeadershipId(v); setPicker(null); }}
        employeeOptions={employeeOptions} empsLoading={empsLoading}
        submitterId={submitterId} onSelectSubmitter={(v) => { setSubmitterId(v); setPicker(null); }}
        departmentOptions={departmentOptions} deptsLoading={deptsLoading} familiarizerDeptIds={familiarizerDeptIds}
        onToggleFamiliarizer={(v) => setFamiliarizerDeptIds((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))}
        approverSelectedId={approverPickerIndex !== null ? approvers[approverPickerIndex]?.employee_id ?? null : null}
        onSelectApprover={(v) => {
          setApprovers((p) => p.map((x, i) => (i === approverPickerIndex ? { ...x, employee_id: v } : x)));
          setApproverPickerIndex(null);
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
    backBtn: { padding: 4 },
    title: { fontSize: 19, fontWeight: '800', color: c.text },
    subtitle: { fontSize: 12, color: c.textMuted, marginTop: 1 },
    createBtn: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, minWidth: 84, alignItems: 'center' },
    createBtnDisabled: { opacity: 0.6 },
    createBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 14 },

    content: { paddingHorizontal: 16, paddingTop: 4 },

    textArea: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, minHeight: 80 },
  });
