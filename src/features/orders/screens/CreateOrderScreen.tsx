import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
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
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useBreakpoint } from '@/utils/responsive';
import {
  orderCategoriesQuery, orderEmployeesQuery, orderDepartmentsQuery, orderLeadershipQuery,
  orderDetailQuery,
} from '../api/queries';
import { useCreateOrder, useUpdateOrder } from '../api/mutations';
import { Field, Selector } from '../components/FormParts';
import { SelectedChips } from '@/components/SelectedChips';
import { ApproversEditor, type Approver } from '../components/ApproversEditor';
import { OrderPickers, type PickerKind } from '../components/OrderPickers';
import { KeyboardAvoider } from '@/components/KeyboardAvoider';
import { resolveEmployeeBranchId } from '@/utils/branch';

export default function CreateOrderScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  // TAHRIR rejimi: `id` berilsa mavjud buyruq yuklanadi va POST o'rniga PATCH
  // yuboriladi (web AddOrderDrawer `editId` bilan bir xil).
  const { id: editIdParam } = useLocalSearchParams<{ id?: string }>();
  const editId = editIdParam ? Number(editIdParam) : null;
  const { data: editing } = useQuery({ ...orderDetailQuery(editId ?? 0), enabled: !!editId });
  const branchId =
    editing?.organization_branch_id ??
    resolveEmployeeBranchId(employee);
  const hr = isHR(user);
  const creatorRole = hr ? 'hr' : 'employee';

  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const createMutation = useCreateOrder();
  const updateMutation = useUpdateOrder();
  const bp = useBreakpoint();
  const twoCol = bp.isTablet;

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

  // Tahrir rejimida formani BIR MARTA to'ldiramiz (keyingi refetch kiritilayotgan
  // matnni bosib ketmasin). RENDER PAYTIDA moslash — React'ning "adjusting state
  // when a prop changes" naqshi (effekt ichida setState ortiqcha kaskad render
  // beradi: react-hooks/set-state-in-effect).
  const [prefilledFor, setPrefilledFor] = useState<number | null>(null);
  if (editing && prefilledFor !== editing.id) {
    setPrefilledFor(editing.id);
    setCategoryId(editing.category_id ?? null);
    setSummary(editing.summary ?? '');
    setDescription(editing.description ?? '');
    setSubmitterId(editing.submitter_id ?? null);
    const signers = editing.assigned_signers ?? [];
    setLeadershipId(signers.find((sg) => sg.signer_type === 'leadership')?.employee_id ?? null);
    setApprovers(
      signers
        .filter((sg) => sg.signer_type === 'approver')
        .map((sg) => ({
          employee_id: sg.employee_id ?? sg.employee?.id ?? 0,
          can_edit_document: sg.can_edit_document ?? false,
        }))
        .filter((a) => a.employee_id),
    );
    setFamiliarizerDeptIds(
      Array.from(new Set(
        (editing.familiarizers ?? [])
          .map((f) => f.employee?.department?.id)
          .filter((v): v is number => v != null),
      )),
    );
  }

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
    if (!categoryId) { Alert.alert(t('common.errorTitle'), t('orders.categoryRequired')); return; }
    if (!description.trim()) { Alert.alert(t('common.errorTitle'), t('orders.descriptionRequired')); return; }
    // Web parity (AddOrderDrawer, c66c2af) + backend 7b3326f: decree/submit now
    // 400s `approver_required` — without at least one kelishuvchi the decree
    // would skip the agreement/sign stages straight to 'approved'.
    if (!approvers.some((a) => a.employee_id)) { Alert.alert(t('common.errorTitle'), t('orders.approverRequired')); return; }
    if (!leadershipId) { Alert.alert(t('common.errorTitle'), t('orders.leadershipRequired')); return; }
    if (!branchId) { Alert.alert(t('common.errorTitle'), t('orders.branchNotFound')); return; }

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
    };

    const onFilesError = () =>
      Alert.alert(t('orders.filesPartialTitle'), t('orders.filesPartialMessage'));

    setSaving(true);
    try {
      if (editId) {
        // Tahrirda EGALIK o'zgarmaydi — filial hujjatniki bo'lib qoladi
        // (web ham editда `organization_branch_id` yubormaydi).
        await updateMutation.mutateAsync({ id: editId, payload, files, onFilesError });
        router.back();
      } else {
        const orderId = await createMutation.mutateAsync({
          payload: { ...payload, organization_branch_id: branchId },
          files,
          onFilesError,
        });
        router.replace({ pathname: '/order-detail', params: { id: String(orderId) } });
      }
    } catch (err) {
      Alert.alert(t('common.errorTitle'), getApiErrorMessage(err, t('errors.generic')));
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Screen edges={['top', 'bottom']} maxWidth={640}>
      <ScreenHeader
        title={editId ? t('orders.editTitle') : t('orders.createTitle')}
        subtitle={hr ? t('orders.hrSubtitle') : t('orders.employeeSubtitle')}
        right={
          <TouchableOpacity
            style={[styles.createBtn, saving && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.createBtnText}>{editId ? t('common.save') : t('common.create')}</Text>}
          </TouchableOpacity>
        }
      />

      <KeyboardAvoider>
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

        {/* Leadership (rahbariyat) is required on EVERY order for every role —
            mirrors the web (AddOrderDrawer renders it unconditionally). Gating it
            behind `hr` hid a mandatory field from employees, so they could never
            satisfy the `leadershipId` validation and were blocked from creating.
            Both are short single-select Fields, so on tablet (Task 21) they pair
            into a 2-column row instead of stacking full-width. */}
        <View
          testID="order-leadership-submitter-row"
          style={twoCol ? styles.fieldRow : undefined}
        >
          <View testID="order-field-leadership" style={twoCol ? styles.fieldHalf : undefined}>
            <Field label={t('orders.leadershipLabel')} required>
              <Selector
                loading={leadershipLoading}
                text={nameOf(leadershipId, leadershipOptions)}
                placeholder={t('orders.leadershipPlaceholder')}
                onPress={() => setPicker('leadership')}
              />
            </Field>
          </View>

          <View testID="order-field-submitter" style={twoCol ? styles.fieldHalf : undefined}>
            <Field label={t('orders.submitterLabel')}>
              <Selector
                loading={empsLoading}
                text={nameOf(submitterId, employeeOptions)}
                placeholder={t('orders.selectPlaceholder')}
                onPress={() => setPicker('submitter')}
                onClear={submitterId ? () => setSubmitterId(null) : undefined}
              />
            </Field>
          </View>
        </View>

        <AttachmentField files={files} onPick={pickFiles} onRemove={(i) => setFiles((p) => p.filter((_, idx) => idx !== i))} />

        <Field label={t('orders.familiarizersLabel')}>
          <Selector
            loading={deptsLoading}
            text={familiarizerDeptIds.length ? t('orders.deptsSelected', { count: familiarizerDeptIds.length }) : undefined}
            placeholder={t('orders.familiarizersPlaceholder')}
            onPress={() => setPicker('familiarizers')}
          />
          {/* Tanlangan bo'limlarning NOMI ko'rinadi: ilgari faqat son bor edi
              va foydalanuvchi qaysi bo'limlarni belgilaganini oynani qayta
              ochmasdan bilolmasdi. */}
          <SelectedChips
            items={familiarizerDeptIds.map((id) => ({
              value: id,
              label: departmentOptions.find((o) => o.value === id)?.label ?? `#${id}`,
            }))}
            onRemove={(id) => setFamiliarizerDeptIds((prev) => prev.filter((x) => x !== id))}
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
      </KeyboardAvoider>

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
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    createBtn: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, minWidth: 84, alignItems: 'center' },
    createBtnDisabled: { opacity: 0.6 },
    createBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 14 },

    content: { paddingHorizontal: 16, paddingTop: 4 },

    textArea: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, minHeight: 80 },

    // Task 21: 2-column pairing for short fields on tablet (bp.isTablet).
    fieldRow: { flexDirection: 'row', gap: 12 },
    fieldHalf: { flex: 1 },
  });
