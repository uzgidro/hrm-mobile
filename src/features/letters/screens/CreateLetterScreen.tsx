import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { employeeSubLabel } from '@/utils/roles';
import { getApiErrorMessage } from '@/api/errors';
import { type PickerOption } from '@/components/PickerModal';
import { AttachmentField, type PickedFile } from '@/components/AttachmentField';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { Employee } from '@/types';
import { Icon } from '@/components/Icon';
import {
  letterSignersQuery, letterRahbariyatQuery, letterSubmittersQuery, orgBranchesQuery,
} from '../api/queries';
import { useCreateLetter } from '../api/mutations';
import { Field, Selector } from '../components/FormParts';
import { LetterFormFields } from '../components/LetterFormFields';
import { LetterPickers, type PickerKind, type DateKind } from '../components/LetterPickers';

type LetterType = 'explanatory' | 'application' | 'business_trip';
// Value/labelKey pairs — the numeric picker values are internal (never sent to
// the API; they map to the letter-type CODES below), the labels are localized
// at render via t().
const TYPE_OPTION_KEYS: { value: number; labelKey: string }[] = [
  { value: 1, labelKey: 'letters.typeNotification' },
  { value: 2, labelKey: 'letters.typeApplication' },
  { value: 3, labelKey: 'letters.typeBusinessTrip' },
];
const TYPE_BY_VALUE: Record<number, LetterType> = { 1: 'explanatory', 2: 'application', 3: 'business_trip' };
const VALUE_BY_TYPE: Record<LetterType, number> = { explanatory: 1, application: 2, business_trip: 3 };

export default function CreateLetterScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const employee = user?.employee;
  const branchId = employee?.organization_branches?.[0]?.id ?? employee?.department?.organization_branch_id;

  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const createMutation = useCreateLetter();

  const TYPE_OPTIONS = useMemo<PickerOption[]>(
    () => TYPE_OPTION_KEYS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t]
  );

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
  const { data: signerEmps = [], isLoading: signersLoading } = useQuery(letterSignersQuery(branchId));
  const { data: rahbariyatEmps = [], isLoading: rahbariyatLoading } = useQuery(letterRahbariyatQuery(branchId, isTrip));
  const { data: submitterData, isLoading: submittersLoading } = useQuery(letterSubmittersQuery(branchId, isTrip));
  const { data: branches = [], isLoading: branchesLoading } = useQuery(orgBranchesQuery(isTrip));

  // ── Options ──────────────────────────────────────────────────────────────────
  const empOption = useCallback(
    (e: Employee): PickerOption => ({ value: e.id, label: e.legal_name || t('status.unknown'), subLabel: employeeSubLabel(e), photo: e.photo_path ?? null }),
    [t]
  );
  const signerOptions = useMemo(() => signerEmps.map(empOption), [signerEmps, empOption]);
  const ordinaryOptions = useMemo(() => signerOptions.filter((o) => o.value !== mainSignerId), [signerOptions, mainSignerId]);
  const rahbariyatOptions = useMemo(() => rahbariyatEmps.map(empOption), [rahbariyatEmps, empOption]);
  const submitterOptions = useMemo(() => (submitterData?.items ?? []).map(empOption), [submitterData, empOption]);

  const regionOptions = useMemo<PickerOption[]>(() => {
    const set = Array.from(new Set(branches.map((b) => b.region).filter(Boolean)));
    return set.map((r, i) => ({ value: i + 1, label: String(r) }));
  }, [branches]);
  const regionLabelByValue = (v: number) => regionOptions.find((o) => o.value === v)?.label;

  const destinationOptions = useMemo<PickerOption[]>(
    () => branches.filter((b) => regions.length === 0 || regions.includes(b.region)).map((b) => ({ value: b.id, label: b.name, subLabel: b.region })),
    [branches, regions]
  );

  const nameOf = (id: number | null, opts: PickerOption[]) => opts.find((o) => o.value === id)?.label;
  // regions stored as string[]; map via region option values
  const selectedRegionValues = useMemo(
    () => regionOptions.filter((o) => regions.includes(o.label)).map((o) => o.value),
    [regionOptions, regions]
  );

  const toggleRegion = (v: number) => {
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
  };
  const toggle = (setter: React.Dispatch<React.SetStateAction<number[]>>) => (v: number) =>
    setter((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!letterType) { Alert.alert(t('letters.validationTitle'), t('letters.typeRequired')); return; }
    if (!branchId) { Alert.alert(t('letters.validationTitle'), t('letters.branchNotFound')); return; }
    if (!isTrip && !mainSignerId) { Alert.alert(t('letters.validationTitle'), t('letters.mainSignerRequired')); return; }
    if (isTrip) {
      if (destinationIds.length === 0) { Alert.alert(t('letters.validationTitle'), t('letters.destinationRequired')); return; }
      if (!submitterId) { Alert.alert(t('letters.validationTitle'), t('letters.submitterRequired')); return; }
      if (rahbariyatIds.length === 0) { Alert.alert(t('letters.validationTitle'), t('letters.leadershipRequired')); return; }
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
      const letterId = await createMutation.mutateAsync({
        payload,
        files,
        onFilesError: () => Alert.alert(t('letters.attachmentNoticeTitle'), t('letters.attachmentFailed')),
      });
      router.replace({ pathname: '/letter-detail', params: { id: String(letterId) } });
    } catch (err) {
      Alert.alert(t('letters.validationTitle'), getApiErrorMessage(err, t('letters.createError')));
    } finally {
      setSaving(false);
    }
  }

  const typeHint = !letterType ? '' :
    letterType === 'application' ? t('letters.hintApplication') :
    isTrip ? t('letters.hintBusinessTrip') :
    t('letters.hintNotification');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('letters.createTitle')}</Text>
        <TouchableOpacity style={[styles.createBtn, saving && styles.createBtnDisabled]} onPress={handleCreate} disabled={saving} activeOpacity={0.8}>
          {saving ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.createBtnText}>{t('common.create')}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label={t('letters.fieldType')} required>
          <Selector text={letterType ? TYPE_OPTIONS.find((o) => TYPE_BY_VALUE[o.value] === letterType)?.label : undefined} placeholder={t('letters.placeholderSelect')} onPress={() => setPicker('type')} />
        </Field>

        <Field label={t('letters.fieldLetterDate')}>
          <Selector text={letterDate ? dayjs(letterDate).format('DD.MM.YYYY') : undefined} placeholder={t('letters.placeholderSelectDate')} onPress={() => setDatePicker('letter')} />
        </Field>

        <LetterFormFields
          isTrip={isTrip}
          typeHint={typeHint}
          onOpenPicker={setPicker}
          onOpenDate={setDatePicker}
          departureDate={departureDate} arrivalDate={arrivalDate} regions={regions} destinationIds={destinationIds} branchesLoading={branchesLoading}
          description={description} onChangeDescription={setDescription}
          workPlan={workPlan} onChangeWorkPlan={setWorkPlan}
          shortSummary={shortSummary} onChangeShortSummary={setShortSummary}
          rahbariyatIds={rahbariyatIds} rahbariyatLoading={rahbariyatLoading}
          submitterId={submitterId} submitterOptions={submitterOptions} submittersLoading={submittersLoading}
          mainSignerId={mainSignerId} signerOptions={signerOptions} ordinarySigners={ordinarySigners} signersLoading={signersLoading}
          nameOf={nameOf}
        />

        <AttachmentField label={t('letters.fieldAttachment')} files={files} onPick={pickFiles} onRemove={() => setFiles([])} />

        <View style={{ height: 40 }} />
      </ScrollView>

      <LetterPickers
        picker={picker}
        datePicker={datePicker}
        onClosePicker={() => setPicker(null)}
        onCloseDatePicker={() => setDatePicker(null)}
        typeOptions={TYPE_OPTIONS}
        selectedTypeValue={letterType ? VALUE_BY_TYPE[letterType] : null}
        onSelectType={(v) => { setLetterType(TYPE_BY_VALUE[v]); setPicker(null); }}
        signerOptions={signerOptions} ordinaryOptions={ordinaryOptions} signersLoading={signersLoading}
        mainSignerId={mainSignerId} onSelectMain={(v) => { setMainSignerId(v); setPicker(null); }}
        ordinarySigners={ordinarySigners} onToggleOrdinary={toggle(setOrdinarySigners)}
        rahbariyatOptions={rahbariyatOptions} rahbariyatLoading={rahbariyatLoading}
        rahbariyatIds={rahbariyatIds} onToggleRahbariyat={toggle(setRahbariyatIds)}
        submitterOptions={submitterOptions} submittersLoading={submittersLoading}
        submitterId={submitterId} onSelectSubmitter={(v) => { setSubmitterId(v); setPicker(null); }}
        regionOptions={regionOptions} branchesLoading={branchesLoading}
        selectedRegionValues={selectedRegionValues} onToggleRegion={toggleRegion}
        destinationOptions={destinationOptions} destinationIds={destinationIds} onToggleDestination={toggle(setDestinationIds)}
        letterDate={letterDate} departureDate={departureDate} arrivalDate={arrivalDate}
        onConfirmLetterDate={setLetterDate} onConfirmDepartureDate={setDepartureDate} onConfirmArrivalDate={setArrivalDate}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
    backBtn: { padding: 4 },
    title: { flex: 1, fontSize: 19, fontWeight: '800', color: c.text },
    createBtn: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, minWidth: 84, alignItems: 'center' },
    createBtnDisabled: { opacity: 0.6 },
    createBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 14 },
    content: { paddingHorizontal: 16, paddingTop: 4 },
  });
