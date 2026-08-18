import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { PickerOption } from '@/components/PickerModal';
import { useBreakpoint } from '@/utils/responsive';
import { Field, Selector } from './FormParts';
import type { PickerKind, DateKind } from './LetterPickers';

// The type-dependent field group of the create-letter form (business-trip vs
// bildirgi/ariza). Selection state + option sources stay in the screen; this is
// pure composition wired through the two openers and the text setters.
/* Safar yaratish formasidagi transport tanlovi VAQTINCHA yashirilgan
 * (2026-08-18). Web'dagi AddLetterDrawer.SHOW_VEHICLE_IN_CREATE_FORM bilan bir
 * xil bayroq — ikkalasini birga yoqing. */
const SHOW_VEHICLE_IN_CREATE_FORM = false;

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
  // Avtopark: mashina kerakmi + izoh. Aynan qaysi mashina berilishini BFD
  // hal qiladi — bu yerda mashina TANLANMAYDI.
  vehicleNeeded: boolean;
  onToggleVehicle: (v: boolean) => void;
  vehicleNote: string;
  onChangeVehicleNote: (v: string) => void;
  onChangeWorkPlan: (v: string) => void;
  shortSummary: string;
  onChangeShortSummary: (v: string) => void;

  rahbariyatIds: number[];
  rahbariyatLoading: boolean;
  submitterId: number | null;
  submitterOptions: PickerOption[];
  submittersLoading: boolean;

  mainSignerId: number | null;
  signerOptions: PickerOption[];
  ordinarySigners: number[];
  signersLoading: boolean;
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
    vehicleNeeded, onToggleVehicle, vehicleNote, onChangeVehicleNote,
    rahbariyatIds, rahbariyatLoading, submitterId, submitterOptions, submittersLoading,
    mainSignerId, signerOptions, ordinarySigners, signersLoading, nameOf,
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

          {/* Avtopark: faqat "kerak/kerak emas" — mashinani BFD biriktiradi.
              VAQTINCHA YASHIRILGAN (foydalanuvchi so'rovi 2026-08-18, web bilan
              bir xil): safar YARATISHDA tanlov ko'rsatilmaydi. Modulning qolgan
              qismi ishlaydi — kartochkadagi "Mashina so'rash" va BFD javobi.
              QAYTARISH: SHOW_VEHICLE_IN_CREATE_FORM = true. */}
          {SHOW_VEHICLE_IN_CREATE_FORM && (
          <Field label={t('letters.vehicleSection')}>
            <View style={styles.vehicleRow}>
              {[false, true].map((val) => (
                <TouchableOpacity
                  key={String(val)}
                  testID={`letter-vehicle-${val ? 'needed' : 'none'}`}
                  style={[styles.vehicleChip, vehicleNeeded === val && styles.vehicleChipActive]}
                  onPress={() => onToggleVehicle(val)}
                >
                  <Text style={[styles.vehicleChipText, vehicleNeeded === val && styles.vehicleChipTextActive]}>
                    {t(val ? 'letters.vehicleNeeded' : 'letters.vehicleWithout')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {vehicleNeeded && (
              <>
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder={t('letters.vehicleNotePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={vehicleNote}
                  onChangeText={onChangeVehicleNote}
                />
                <Text style={styles.vehicleHint}>{t('letters.vehicleAssignedByBfd')}</Text>
              </>
            )}
          </Field>
          )}

          {/* leadership + submitter: both short selectors, adjacent — pair on tablet. */}
          <View testID="letter-leadership-submitter-row" style={twoCol ? styles.fieldRow : undefined}>
            <View testID="letter-field-leadership" style={twoCol ? styles.fieldHalf : undefined}>
              <Field label={t('letters.fieldLeadership')} required>
                <Selector loading={rahbariyatLoading} text={rahbariyatIds.length ? t('letters.leadershipSelected', { count: rahbariyatIds.length }) : undefined} placeholder={t('letters.placeholderLeadership')} onPress={() => onOpenPicker('rahbariyat')} />
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

          {/* main signer + coordinators: both short selectors, adjacent — pair on tablet. */}
          <View testID="letter-signer-coordinators-row" style={twoCol ? styles.fieldRow : undefined}>
            <View testID="letter-field-mainSigner" style={twoCol ? styles.fieldHalf : undefined}>
              <Field label={t('letters.fieldMainSigner')} required>
                <Selector loading={signersLoading} text={nameOf(mainSignerId, signerOptions)} placeholder={t('letters.placeholderLeadership')} onPress={() => onOpenPicker('main')} />
              </Field>
            </View>
            <View testID="letter-field-coordinators" style={twoCol ? styles.fieldHalf : undefined}>
              <Field label={t('letters.fieldCoordinators')}>
                <Selector loading={signersLoading} text={ordinarySigners.length ? t('letters.coordinatorsSelected', { count: ordinarySigners.length }) : undefined} placeholder={t('letters.placeholderCoordinators')} onPress={() => onOpenPicker('ordinary')} />
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
    vehicleRow: { flexDirection: 'row', gap: 8 },
    vehicleChip: {
      borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 9, backgroundColor: c.card,
    },
    vehicleChipActive: { borderColor: c.primary, backgroundColor: c.primarySoft },
    vehicleChipText: { fontSize: 13, color: c.textSecondary },
    vehicleChipTextActive: { color: c.primary, fontWeight: '600' },
    vehicleHint: { fontSize: 12, color: c.textMuted, marginTop: 6 },
    input: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text },
    textArea: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, minHeight: 100 },
    hintBox: { marginTop: 14, backgroundColor: c.primarySoft, borderRadius: 10, padding: 12 },
    hintText: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },

    // Task 21: 2-column pairing for short fields on tablet (bp.isTablet).
    fieldRow: { flexDirection: 'row', gap: 12 },
    fieldHalf: { flex: 1 },
  });
