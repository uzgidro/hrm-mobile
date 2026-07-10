import { View, Text, TextInput, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { PickerOption } from '@/components/PickerModal';
import { Field, Selector } from './FormParts';
import type { PickerKind, DateKind } from './LetterPickers';

// The type-dependent field group of the create-letter form (business-trip vs
// bildirgi/ariza). Selection state + option sources stay in the screen; this is
// pure composition wired through the two openers and the text setters.
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
  const {
    isTrip, typeHint, onOpenPicker, onOpenDate,
    departureDate, arrivalDate, regions, destinationIds, branchesLoading,
    description, onChangeDescription, workPlan, onChangeWorkPlan, shortSummary, onChangeShortSummary,
    rahbariyatIds, rahbariyatLoading, submitterId, submitterOptions, submittersLoading,
    mainSignerId, signerOptions, ordinarySigners, signersLoading, nameOf,
  } = props;

  return (
    <>
      {!!typeHint && <View style={styles.hintBox}><Text style={styles.hintText}>{typeHint}</Text></View>}

      {isTrip ? (
        <>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label={t('letters.fieldDepartureDate')}>
                <Selector text={departureDate ? dayjs(departureDate).format('DD.MM.YYYY') : undefined} placeholder={t('letters.placeholderDate')} onPress={() => onOpenDate('departure')} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('letters.fieldArrivalDate')}>
                <Selector text={arrivalDate ? dayjs(arrivalDate).format('DD.MM.YYYY') : undefined} placeholder={t('letters.placeholderDate')} onPress={() => onOpenDate('arrival')} />
              </Field>
            </View>
          </View>

          <Field label={t('letters.fieldRegions')}>
            <Selector loading={branchesLoading} text={regions.length ? t('letters.regionsSelected', { count: regions.length }) : undefined} placeholder={t('letters.placeholderRegions')} onPress={() => onOpenPicker('regions')} />
          </Field>
          <Field label={t('letters.fieldDestinations')} required>
            <Selector loading={branchesLoading} text={destinationIds.length ? t('letters.destinationsSelected', { count: destinationIds.length }) : undefined} placeholder={t('letters.placeholderDestinations')} onPress={() => onOpenPicker('destinations')} />
          </Field>

          <Field label={t('letters.fieldTripPurpose')}>
            <TextInput style={[styles.textArea, { minHeight: 100 }]} placeholder={t('letters.placeholderTripPurpose')} placeholderTextColor={colors.textMuted} value={description} onChangeText={onChangeDescription} multiline textAlignVertical="top" />
          </Field>

          <Field label={t('letters.fieldWorkPlan')}>
            <TextInput style={[styles.textArea, { minHeight: 100 }]} placeholder={t('letters.placeholderWorkPlan')} placeholderTextColor={colors.textMuted} value={workPlan} onChangeText={onChangeWorkPlan} multiline textAlignVertical="top" />
          </Field>

          <Field label={t('letters.fieldLeadership')} required>
            <Selector loading={rahbariyatLoading} text={rahbariyatIds.length ? t('letters.leadershipSelected', { count: rahbariyatIds.length }) : undefined} placeholder={t('letters.placeholderLeadership')} onPress={() => onOpenPicker('rahbariyat')} />
          </Field>
          <Field label={t('letters.fieldSubmitter')} required>
            <Selector loading={submittersLoading} text={nameOf(submitterId, submitterOptions)} placeholder={t('letters.placeholderSubmitter')} onPress={() => onOpenPicker('submitter')} />
          </Field>
        </>
      ) : (
        <>
          <Field label={t('letters.fieldShortSummary')}>
            <TextInput style={styles.input} placeholder={t('letters.placeholderShortSummary')} placeholderTextColor={colors.textMuted} value={shortSummary} onChangeText={onChangeShortSummary} />
          </Field>
          <Field label={t('letters.fieldText')}>
            <TextInput style={[styles.textArea, { minHeight: 140 }]} placeholder={t('letters.placeholderText')} placeholderTextColor={colors.textMuted} value={description} onChangeText={onChangeDescription} multiline textAlignVertical="top" />
          </Field>
          <Field label={t('letters.fieldMainSigner')} required>
            <Selector loading={signersLoading} text={nameOf(mainSignerId, signerOptions)} placeholder={t('letters.placeholderLeadership')} onPress={() => onOpenPicker('main')} />
          </Field>
          <Field label={t('letters.fieldCoordinators')}>
            <Selector loading={signersLoading} text={ordinarySigners.length ? t('letters.coordinatorsSelected', { count: ordinarySigners.length }) : undefined} placeholder={t('letters.placeholderCoordinators')} onPress={() => onOpenPicker('ordinary')} />
          </Field>
        </>
      )}
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row2: { flexDirection: 'row', gap: 12 },
    input: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text },
    textArea: { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text, minHeight: 100 },
    hintBox: { marginTop: 14, backgroundColor: c.primarySoft, borderRadius: 10, padding: 12 },
    hintText: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
  });
