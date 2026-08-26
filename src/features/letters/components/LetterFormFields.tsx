import { View, Text, TextInput, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { PickerOption } from '@/components/PickerModal';
import { useBreakpoint } from '@/utils/responsive';
import { Field, Selector } from './FormParts';
import type { PickerKind, DateKind } from './LetterPickers';
import { SelectedChips } from '@/components/SelectedChips';

// The type-dependent field group of the create-letter form (business-trip vs
// bildirgi/ariza). Selection state + option sources stay in the screen; this is
// pure composition wired through the two openers and the text setters.

// Tanlangan id larni chip (qiymat + nom) ga aylantiradi. Nomi topilmagan id
// TASHLAB YUBORILMAYDI: u ham ko'rinishi kerak (aks holda tanlov "yo'qolgan"
// bo'lib tuyulardi) — o'rniga id ko'rsatiladi.
function chipsOf(ids: number[], options: PickerOption[]) {
  return ids.map((id) => ({
    value: id,
    label: options.find((o) => o.value === id)?.label ?? `#${id}`,
  }));
}

export function LetterFormFields(props: {
  isTrip: boolean;
  typeHint: string;
  onOpenPicker: (k: Exclude<PickerKind, null>) => void;
  onOpenDate: (k: Exclude<DateKind, null>) => void;

  departureDate: string | null;
  arrivalDate: string | null;
  regions: string[];
  destinationIds: number[];
  branchesLoading: boolean;

  description: string;
  onChangeDescription: (v: string) => void;
  workPlan: string;
  onChangeWorkPlan: (v: string) => void;
  shortSummary: string;
  onChangeShortSummary: (v: string) => void;

  rahbariyatIds: number[];
  /** Tanlanganlarning NOMINI ko'rsatish uchun (chip). */
  rahbariyatOptions: PickerOption[];
  onToggleRahbariyat: (v: number) => void;
  rahbariyatLoading: boolean;
  submitterId: number | null;
  submitterOptions: PickerOption[];
  submittersLoading: boolean;

  mainSignerId: number | null;
  signerOptions: PickerOption[];
  ordinarySigners: number[];
  ordinaryOptions: PickerOption[];
  onToggleOrdinary: (v: number) => void;
  signersLoading: boolean;
  /** Kelishuvchilar ALOHIDA so'rovdan keladi — o'z yuklanish holati bilan. */
  agreementLoading: boolean;
  /** Hujjat MUALLIFI (bildirgi/ariza) — bo'sh bo'lsa joriy foydalanuvchi. */
  creatorId: number | null;
  creatorOptions: PickerOption[];
  nameOf: (id: number | null, opts: PickerOption[]) => string | undefined;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  const twoCol = bp.isTablet;
  const {
    isTrip, typeHint, onOpenPicker, onOpenDate,
    departureDate, arrivalDate, regions, destinationIds, branchesLoading,
    description, onChangeDescription, workPlan, onChangeWorkPlan, shortSummary, onChangeShortSummary,
    rahbariyatIds, rahbariyatOptions, onToggleRahbariyat,
    rahbariyatLoading, submitterId, submitterOptions, submittersLoading,
    mainSignerId, signerOptions, ordinarySigners, ordinaryOptions, onToggleOrdinary,
    signersLoading, agreementLoading,
    creatorId, creatorOptions, nameOf,
  } = props;

  return (
    <>
      {!!typeHint && <View style={styles.hintBox}><Text style={styles.hintText}>{typeHint}</Text></View>}

      {isTrip ? (
        <>
          {/* departure/arrival dates: pre-existing intentional 2-up row
              (predates the tablet adaptive work, web-parity) — left as-is,
              unconditional on both phone and tablet. Task 21 only adds NEW
              pairing for fields that previously stacked full-width. */}
          <View testID="letter-departure-arrival-row" style={styles.fieldRow}>
            <View testID="letter-field-departure" style={styles.fieldHalf}>
              <Field label={t('letters.fieldDepartureDate')}>
                <Selector text={departureDate ? dayjs(departureDate).format('DD.MM.YYYY') : undefined} placeholder={t('letters.placeholderDate')} onPress={() => onOpenDate('departure')} />
              </Field>
            </View>
            <View testID="letter-field-arrival" style={styles.fieldHalf}>
              <Field label={t('letters.fieldArrivalDate')}>
                <Selector text={arrivalDate ? dayjs(arrivalDate).format('DD.MM.YYYY') : undefined} placeholder={t('letters.placeholderDate')} onPress={() => onOpenDate('arrival')} />
              </Field>
            </View>
          </View>

          {/* regions + destinations: both short selectors, adjacent — pair on tablet. */}
          <View testID="letter-regions-destinations-row" style={twoCol ? styles.fieldRow : undefined}>
            <View testID="letter-field-regions" style={twoCol ? styles.fieldHalf : undefined}>
              <Field label={t('letters.fieldRegions')}>
                <Selector loading={branchesLoading} text={regions.length ? t('letters.regionsSelected', { count: regions.length }) : undefined} placeholder={t('letters.placeholderRegions')} onPress={() => onOpenPicker('regions')} />
              </Field>
            </View>
            <View testID="letter-field-destinations" style={twoCol ? styles.fieldHalf : undefined}>
              <Field label={t('letters.fieldDestinations')} required>
                <Selector loading={branchesLoading} text={destinationIds.length ? t('letters.destinationsSelected', { count: destinationIds.length }) : undefined} placeholder={t('letters.placeholderDestinations')} onPress={() => onOpenPicker('destinations')} />
              </Field>
            </View>
          </View>

          <Field label={t('letters.fieldTripPurpose')}>
            <TextInput style={[styles.textArea, { minHeight: 100 }]} placeholder={t('letters.placeholderTripPurpose')} placeholderTextColor={colors.textMuted} value={description} onChangeText={onChangeDescription} multiline textAlignVertical="top" />
          </Field>

          <Field label={t('letters.fieldWorkPlan')}>
            <TextInput style={[styles.textArea, { minHeight: 100 }]} placeholder={t('letters.placeholderWorkPlan')} placeholderTextColor={colors.textMuted} value={workPlan} onChangeText={onChangeWorkPlan} multiline textAlignVertical="top" />
          </Field>

          {/* leadership + submitter: both short selectors, adjacent — pair on tablet. */}
          <View testID="letter-leadership-submitter-row" style={twoCol ? styles.fieldRow : undefined}>
            <View testID="letter-field-leadership" style={twoCol ? styles.fieldHalf : undefined}>
              <Field label={t('letters.fieldLeadership')} required>
                <Selector loading={rahbariyatLoading} text={rahbariyatIds.length ? t('letters.leadershipSelected', { count: rahbariyatIds.length }) : undefined} placeholder={t('letters.placeholderLeadership')} onPress={() => onOpenPicker('rahbariyat')} />
                <SelectedChips items={chipsOf(rahbariyatIds, rahbariyatOptions)} onRemove={onToggleRahbariyat} />
              </Field>
            </View>
            <View testID="letter-field-tripSubmitter" style={twoCol ? styles.fieldHalf : undefined}>
              <Field label={t('letters.fieldSubmitter')}>
                <Selector loading={submittersLoading} text={nameOf(submitterId, submitterOptions)} placeholder={t('letters.placeholderSubmitterOptional')} onPress={() => onOpenPicker('submitter')} />
              </Field>
            </View>
          </View>
        </>
      ) : (
        <>
          <Field label={t('letters.fieldShortSummary')}>
            <TextInput style={styles.input} placeholder={t('letters.placeholderShortSummary')} placeholderTextColor={colors.textMuted} value={shortSummary} onChangeText={onChangeShortSummary} />
          </Field>
          <Field label={t('letters.fieldText')}>
            <TextInput style={[styles.textArea, { minHeight: 140 }]} placeholder={t('letters.placeholderText')} placeholderTextColor={colors.textMuted} value={description} onChangeText={onChangeDescription} multiline textAlignVertical="top" />
          </Field>

          {/* Hujjat MUALLIFI — boshqa xodim nomidan kiritish uchun (web
              "Hujjat yaratuvchisi"). Bo'sh qoldirilsa joriy foydalanuvchi. */}
          <View testID="letter-field-creator">
            <Field label={t('letters.fieldCreator')}>
              <Selector
                loading={agreementLoading}
                text={nameOf(creatorId, creatorOptions)}
                placeholder={t('letters.creatorSelf')}
                onPress={() => onOpenPicker('creator')}
              />
            </Field>
          </View>

          {/* main signer + coordinators: both short selectors, adjacent — pair on tablet. */}
          <View testID="letter-signer-coordinators-row" style={twoCol ? styles.fieldRow : undefined}>
            <View testID="letter-field-mainSigner" style={twoCol ? styles.fieldHalf : undefined}>
              <Field label={t('letters.fieldMainSigner')} required>
                <Selector loading={signersLoading} text={nameOf(mainSignerId, signerOptions)} placeholder={t('letters.placeholderLeadership')} onPress={() => onOpenPicker('main')} />
              </Field>
            </View>
            <View testID="letter-field-coordinators" style={twoCol ? styles.fieldHalf : undefined}>
              <Field label={t('letters.fieldCoordinators')}>
                <Selector loading={agreementLoading} text={ordinarySigners.length ? t('letters.coordinatorsSelected', { count: ordinarySigners.length }) : undefined} placeholder={t('letters.placeholderCoordinators')} onPress={() => onOpenPicker('ordinary')} />
                <SelectedChips items={chipsOf(ordinarySigners, ordinaryOptions)} onRemove={onToggleOrdinary} />
              </Field>
            </View>
          </View>
        </>
      )}
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    input: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text },
    textArea: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, minHeight: 100 },
    hintBox: { marginTop: 14, backgroundColor: c.primarySoft, borderRadius: 10, padding: 12 },
    hintText: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },

    // Task 21: 2-column pairing for short fields on tablet (bp.isTablet).
    fieldRow: { flexDirection: 'row', gap: 12 },
    fieldHalf: { flex: 1 },
  });
