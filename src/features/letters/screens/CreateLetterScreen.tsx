import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { employeeSubLabel } from '@/utils/roles';
import { branchRegions, regionLabels, branchesInRegions } from '@/utils/tripRegions';
import { normalizeLetterType } from '@/utils/letterStatus';
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
  letterSignersQuery, letterRahbariyatQuery, letterSubmittersQuery, orgBranchesQuery,
  letterAgreementSignersQuery, letterDetailQuery,
} from '../api/queries';
import { useCreateLetter, useUpdateLetter } from '../api/mutations';
import { Field, Selector } from '../components/FormParts';
import { LetterFormFields } from '../components/LetterFormFields';
import { LetterPickers, type PickerKind, type DateKind } from '../components/LetterPickers';
import { buildLetterCreatePayload } from './letterCreatePayload';

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
  // TAHRIR rejimi: `id` berilsa mavjud hujjat yuklanadi va POST o'rniga PATCH
  // yuboriladi (web AddLetterDrawer `editId` bilan bir xil). Filial tahrirda
  // O'ZGARMAYDI — hujjatning o'z filiali saqlanadi.
  const { id: editIdParam } = useLocalSearchParams<{ id?: string }>();
  const editId = editIdParam ? Number(editIdParam) : null;
  const { data: editing } = useQuery({ ...letterDetailQuery(editId ?? 0), enabled: !!editId });
  const branchId = editing?.organization_branch_id
    ?? employee?.organization_branches?.[0]?.id
    ?? employee?.department?.organization_branch_id;

  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const createMutation = useCreateLetter();
  const updateMutation = useUpdateLetter();
  const bp = useBreakpoint();
  const twoCol = bp.isTablet;

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
  // Hujjat MUALLIFI (bildirgi/ariza) — bo'sh bo'lsa joriy foydalanuvchi.
  const [creatorId, setCreatorId] = useState<number | null>(null);
  const [rahbariyatIds, setRahbariyatIds] = useState<number[]>([]);

  const [picker, setPicker] = useState<PickerKind>(null);
  const [datePicker, setDatePicker] = useState<DateKind>(null);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [saving, setSaving] = useState(false);

  const isTrip = letterType === 'business_trip';

  // Tahrir rejimida formani BIR MARTA to'ldiramiz (keyingi refetch foydalanuvchi
  // kiritayotgan matnni bosib ketmasin). RENDER PAYTIDA moslash — React'ning
  // "adjusting state when a prop changes" naqshi: effekt ichida setState qilish
  // ortiqcha kaskad render beradi (react-hooks/set-state-in-effect).
  const [prefilledFor, setPrefilledFor] = useState<number | null>(null);
  if (editing && prefilledFor !== editing.id) {
    setPrefilledFor(editing.id);
    const type = normalizeLetterType(editing.letter_type) as LetterType;
    setLetterType(type === 'business_trip' || type === 'application' ? type : 'explanatory');
    setLetterDate(editing.letter_date ?? dayjs().format('YYYY-MM-DD'));
    // Bildirgi/ariza matni "qisqa mazmun\n\nmatn" ko'rinishida saqlanadi.
    const desc = editing.description ?? '';
    if (type === 'business_trip') {
      setDescription(desc);
      setShortSummary('');
    } else {
      const [head, ...rest] = desc.split('\n\n');
      if (rest.length) { setShortSummary(head); setDescription(rest.join('\n\n')); }
      else { setShortSummary(''); setDescription(desc); }
    }
    setWorkPlan(editing.work_plan ?? '');
    const signers = editing.assigned_signers ?? [];
    setMainSignerId(
      signers.find((sg) => sg.signer_type === 'addressee' || sg.signer_type === 'main')?.employee_id ?? null,
    );
    setOrdinarySigners(
      signers
        .filter((sg) => sg.signer_type === 'agreement' || sg.signer_type === 'ordinary')
        .map((sg) => sg.employee_id)
        .filter((v): v is number => v != null),
    );
    setRahbariyatIds(
      signers
        .filter((sg) => sg.signer_type === 'management')
        .map((sg) => sg.employee_id)
        .filter((v): v is number => v != null),
    );
    setSubmitterId(editing.submitter_id ?? null);
    setCreatorId(editing.creator_employee_id ?? null);
    setDepartureDate(editing.departure_date ?? null);
    setArrivalDate(editing.arrival_date ?? null);
    setDestinationIds((editing.destination_branches ?? []).map((b) => b.id));
    setRegions(
      editing.destination_regions?.length
        ? editing.destination_regions
        : Array.from(new Set((editing.destination_branches ?? []).flatMap(branchRegions))),
    );
  }

  const pickFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setFiles([{ uri: a.uri, name: a.name, mimeType: a.mimeType }]); // single attachment (web parity)
  };

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: signerEmps = [], isLoading: signersLoading } = useQuery(letterSignersQuery(branchId));
  // KELISHUVCHILAR alohida manbadan: filialning BARCHA xodimlari (rol
  // cheklovisiz). Avval adresat ro'yxati qayta ishlatilardi va kelishuvchi
  // sifatida faqat 3-4 ta rahbariyat xodimi chiqardi.
  const { data: agreementEmps = [], isLoading: agreementLoading } =
    useQuery(letterAgreementSignersQuery(branchId, !isTrip));
  const { data: rahbariyatEmps = [], isLoading: rahbariyatLoading } = useQuery(letterRahbariyatQuery(branchId, isTrip));
  const { data: submitterData, isLoading: submittersLoading } = useQuery(letterSubmittersQuery(branchId, isTrip));
  const { data: branches = [], isLoading: branchesLoading } = useQuery(orgBranchesQuery(isTrip));

  // ── Options ──────────────────────────────────────────────────────────────────
  const empOption = useCallback(
    (e: Employee): PickerOption => ({ value: e.id, label: e.legal_name || t('status.unknown'), subLabel: employeeSubLabel(e), photo: e.photo_path ?? null }),
    [t]
  );
  const signerOptions = useMemo(() => signerEmps.map(empOption), [signerEmps, empOption]);
  // Muallif tanlagichi kelishuvchilar bilan BIR XIL manbadan (filialning barcha
  // xodimlari) — web `creatorEmployeesPaginated` ham shunday.
  const creatorOptions = useMemo(() => agreementEmps.map(empOption), [agreementEmps, empOption]);
  // Adresat kelishuvchi ham bo'lib qolmasin (web buildAssignedSigners ham uni
  // kelishuvchilar orasidan chiqarib tashlaydi).
  const ordinaryOptions = useMemo(
    () => agreementEmps.map(empOption).filter((o) => o.value !== mainSignerId),
    [agreementEmps, empOption, mainSignerId],
  );
  const rahbariyatOptions = useMemo(() => rahbariyatEmps.map(empOption), [rahbariyatEmps, empOption]);
  // "Rahbariyat"da belgilangan xodim "Yuboruvchi"da CHIQMASIN (web qoidasi):
  // bitta odam ham rahbariyat (management), ham yuboruvchi (main) bo'lib qolsa
  // imzo oqimi chalkashadi.
  const submitterOptions = useMemo(() => {
    const excluded = new Set<number>([
      ...rahbariyatOptions.map((o) => Number(o.value)),
      ...rahbariyatIds.map(Number),
    ]);
    return (submitterData?.items ?? [])
      .filter((e) => !excluded.has(Number(e.id)))
      .map(empOption);
  }, [submitterData, empOption, rahbariyatOptions, rahbariyatIds]);

  const regionOptions = useMemo<PickerOption[]>(
    () => regionLabels(branches).map((r, i) => ({ value: i + 1, label: r })),
    [branches]
  );
  const regionLabelByValue = (v: number) => regionOptions.find((o) => o.value === v)?.label;

  const destinationOptions = useMemo<PickerOption[]>(
    () => branchesInRegions(branches, regions).map((b) => ({ value: b.id, label: b.name, subLabel: branchRegions(b).join(', ') })),
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
        const allowed = branchesInRegions(branches, next).map((b) => b.id);
        setDestinationIds((d) => d.filter((id) => allowed.includes(id)));
      }
      return next;
    });
  };
  const toggle = (setter: React.Dispatch<React.SetStateAction<number[]>>) => (v: number) =>
    setter((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  // BITTA nomzod bo'lsa AVTO tanlash (web AddLetterDrawer 2026-08-19): ko'p
  // filialda rahbariyat/adresat ro'yxati yagona rahbardan iborat — foydalanuvchi
  // baribir o'shani tanlar edi. TAHRIRda tegilmaydi (tanlov allaqachon bor).
  const soleRahbariyat = !editId && isTrip && rahbariyatIds.length === 0 && rahbariyatOptions.length === 1
    ? Number(rahbariyatOptions[0].value) : null;
  if (soleRahbariyat != null) setRahbariyatIds([soleRahbariyat]);
  const soleAddressee = !editId && !isTrip && mainSignerId == null && signerOptions.length === 1
    ? Number(signerOptions[0].value) : null;
  if (soleAddressee != null) setMainSignerId(soleAddressee);

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!letterType) { Alert.alert(t('common.errorTitle'), t('letters.typeRequired')); return; }
    if (!branchId) { Alert.alert(t('common.errorTitle'), t('letters.branchNotFound')); return; }
    // Bildirgi/ariza: ADRESAT majburiy; ARIZAda ustiga kamida bitta KELISHUVCHI
    // ham shart (backend: addressee_required / agreement_required).
    if (!isTrip && !mainSignerId) { Alert.alert(t('common.errorTitle'), t('letters.mainSignerRequired')); return; }
    if (!isTrip && letterType === 'application' && ordinarySigners.length === 0) {
      Alert.alert(t('common.errorTitle'), t('letters.coordinatorsRequired'));
      return;
    }
    if (isTrip) {
      // submitter is optional (web parity): an empty submitter means the author
      // submits and signs their own trip — the backend handles it.
      // VILOYAT majburiy (web AddLetterDrawer bilan bir xil): hujjatdagi "hudud"
      // aynan shu tanlovdan yoziladi.
      if (regions.length === 0) { Alert.alert(t('common.errorTitle'), t('letters.regionRequired')); return; }
      if (destinationIds.length === 0) { Alert.alert(t('common.errorTitle'), t('letters.destinationRequired')); return; }
      if (rahbariyatIds.length === 0) { Alert.alert(t('common.errorTitle'), t('letters.leadershipRequired')); return; }
    }

    const payload = buildLetterCreatePayload({
      isTrip, letterType, letterDate,
      branchId, employeeId: employee?.id,
      shortSummary, description, workPlan,
      mainSignerId, ordinarySigners, creatorId,
      submitterId, rahbariyatIds, destinationIds, regions,
      departureDate, arrivalDate,
    });
    // Tahrirda hujjat EGALIGI o'zgarmaydi — backend `update_letter` bu
    // maydonlarni baribir e'tiborsiz qoldiradi, lekin ularni yubormaslik
    // aniqroq (web ham editда `organization_branch_id`/`employee_id` yubormaydi).
    if (editId) {
      delete payload.employee_id;
      delete payload.organization_branch_id;
    }

    const onFilesError = () =>
      Alert.alert(t('letters.attachmentNoticeTitle'), t('letters.attachmentFailed'));

    setSaving(true);
    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, payload, files, onFilesError });
        router.back();
      } else {
        const letterId = await createMutation.mutateAsync({ payload, files, onFilesError });
        router.replace({ pathname: '/letter-detail', params: { id: String(letterId) } });
      }
    } catch (err) {
      Alert.alert(t('common.errorTitle'), getApiErrorMessage(err, t('letters.createError')));
    } finally {
      setSaving(false);
    }
  }

  const typeHint = !letterType ? '' :
    letterType === 'application' ? t('letters.hintApplication') :
    isTrip ? t('letters.hintBusinessTrip') :
    t('letters.hintNotification');

  return (
    <Screen edges={['top', 'bottom']} maxWidth={640}>
      <ScreenHeader
        title={editId ? t('letters.editTitle') : t('letters.createTitle')}
        right={
          <TouchableOpacity
            style={[styles.createBtn, saving && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.onPrimary} />
              : <Text style={styles.createBtnText}>{editId ? t('common.save') : t('common.create')}</Text>}
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Both short single-selects, adjacent — pair into a 2-column row on
            tablet (Task 21); stack full-width on phone. */}
        <View testID="letter-type-date-row" style={twoCol ? styles.fieldRow : undefined}>
          <View testID="letter-field-type" style={twoCol ? styles.fieldHalf : undefined}>
            <Field label={t('letters.fieldType')} required>
              <Selector text={letterType ? TYPE_OPTIONS.find((o) => TYPE_BY_VALUE[o.value] === letterType)?.label : undefined} placeholder={t('letters.placeholderSelect')} onPress={() => setPicker('type')} />
            </Field>
          </View>

          <View testID="letter-field-letterDate" style={twoCol ? styles.fieldHalf : undefined}>
            <Field label={t('letters.fieldLetterDate')}>
              <Selector text={letterDate ? dayjs(letterDate).format('DD.MM.YYYY') : undefined} placeholder={t('letters.placeholderSelectDate')} onPress={() => setDatePicker('letter')} />
            </Field>
          </View>
        </View>

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
          rahbariyatOptions={rahbariyatOptions} onToggleRahbariyat={toggle(setRahbariyatIds)}
          submitterId={submitterId} submitterOptions={submitterOptions} submittersLoading={submittersLoading}
          mainSignerId={mainSignerId} signerOptions={signerOptions} ordinarySigners={ordinarySigners} signersLoading={signersLoading}
          ordinaryOptions={ordinaryOptions} onToggleOrdinary={toggle(setOrdinarySigners)}
          agreementLoading={agreementLoading}
          creatorId={creatorId} creatorOptions={creatorOptions}
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
        ordinaryLoading={agreementLoading}
        creatorOptions={creatorOptions} creatorId={creatorId}
        onSelectCreator={(v) => { setCreatorId(v); setPicker(null); }}
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
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    createBtn: { backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, minWidth: 84, alignItems: 'center' },
    createBtnDisabled: { opacity: 0.6 },
    createBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 14 },
    content: { paddingHorizontal: 16, paddingTop: 4 },

    // Task 21: 2-column pairing for short fields on tablet (bp.isTablet).
    fieldRow: { flexDirection: 'row', gap: 12 },
    fieldHalf: { flex: 1 },
  });
