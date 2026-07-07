import { View, Text, TextInput, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { PickerOption } from '@/components/PickerModal';
import { Field, Selector } from './FormParts';
import type { PickerKind, DateKind } from './LetterPickers';

// The type-dependent field group of the create-letter form (business-trip vs
// bildirgi/ariza). Selection state + option sources stay in the screen; this is
// pure composition wired through the two openers and the text setters. All
// Uzbek labels/placeholders and the type hint are preserved verbatim.
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
              <Field label="Borish sanasi">
                <Selector text={departureDate ? dayjs(departureDate).format('DD.MM.YYYY') : undefined} placeholder="Sana" onPress={() => onOpenDate('departure')} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Kelish sanasi">
                <Selector text={arrivalDate ? dayjs(arrivalDate).format('DD.MM.YYYY') : undefined} placeholder="Sana" onPress={() => onOpenDate('arrival')} />
              </Field>
            </View>
          </View>

          <Field label="Viloyat(lar)">
            <Selector loading={branchesLoading} text={regions.length ? `${regions.length} ta viloyat` : undefined} placeholder="Viloyatlarni tanlang..." onPress={() => onOpenPicker('regions')} />
          </Field>
          <Field label="Borish filiali(lar)" required>
            <Selector loading={branchesLoading} text={destinationIds.length ? `${destinationIds.length} ta filial` : undefined} placeholder="Filiallarni tanlang..." onPress={() => onOpenPicker('destinations')} />
          </Field>

          <Field label="Borishdan maqsad">
            <TextInput style={[styles.textArea, { minHeight: 100 }]} placeholder="Borishdan maqsad..." placeholderTextColor={colors.textMuted} value={description} onChangeText={onChangeDescription} multiline textAlignVertical="top" />
          </Field>

          <Field label="Xizmat safari ish rejasi">
            <TextInput style={[styles.textArea, { minHeight: 100 }]} placeholder="Ish rejasi..." placeholderTextColor={colors.textMuted} value={workPlan} onChangeText={onChangeWorkPlan} multiline textAlignVertical="top" />
          </Field>

          <Field label="Rahbariyat (Ministr / Deputy)" required>
            <Selector loading={rahbariyatLoading} text={rahbariyatIds.length ? `${rahbariyatIds.length} ta tanlandi` : undefined} placeholder="Rahbariyatni tanlang..." onPress={() => onOpenPicker('rahbariyat')} />
          </Field>
          <Field label="Yuboruvchi shaxs" required>
            <Selector loading={submittersLoading} text={nameOf(submitterId, submitterOptions)} placeholder="Yuboruvchini tanlang..." onPress={() => onOpenPicker('submitter')} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Qisqa mazmuni">
            <TextInput style={styles.input} placeholder="Qisqa mazmun..." placeholderTextColor={colors.textMuted} value={shortSummary} onChangeText={onChangeShortSummary} />
          </Field>
          <Field label="Matn">
            <TextInput style={[styles.textArea, { minHeight: 140 }]} placeholder="Hujjat matni..." placeholderTextColor={colors.textMuted} value={description} onChangeText={onChangeDescription} multiline textAlignVertical="top" />
          </Field>
          <Field label="Rahbariyat (imzolovchi)" required>
            <Selector loading={signersLoading} text={nameOf(mainSignerId, signerOptions)} placeholder="Rahbariyatni tanlang..." onPress={() => onOpenPicker('main')} />
          </Field>
          <Field label="Kelishuvchilar">
            <Selector loading={signersLoading} text={ordinarySigners.length ? `${ordinarySigners.length} ta kelishuvchi` : undefined} placeholder="Kelishuvchilarni tanlang..." onPress={() => onOpenPicker('ordinary')} />
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
