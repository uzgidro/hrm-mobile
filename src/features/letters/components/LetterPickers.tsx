import { useTranslation } from 'react-i18next';
import { PickerModal, type PickerOption } from '@/components/PickerModal';
import { DatePickerModal } from '@/components/DatePicker';

export type PickerKind =
  | 'type' | 'main' | 'ordinary' | 'submitter' | 'rahbariyat' | 'regions' | 'destinations'
  // Bildirgi/ariza MUALLIFI (boshqa xodim nomidan kiritish) — web'da bor edi,
  // mobilда yo'q edi, ya'ni faqat o'z nomingdan yozish mumkin edi.
  | 'creator' | null;
export type DateKind = 'letter' | 'departure' | 'arrival' | null;

// All picker + date-picker modals of the create-letter form, grouped so the
// screen body stays composition-only. Selection state stays in the screen; this
// only wires each modal's visibility + option source + callbacks. The regions
// toggle carries the destination-pruning logic passed in from the screen.
export function LetterPickers(props: {
  picker: PickerKind;
  datePicker: DateKind;
  onClosePicker: () => void;
  onCloseDatePicker: () => void;

  typeOptions: PickerOption[];
  selectedTypeValue: number | null;
  onSelectType: (v: number) => void;

  signerOptions: PickerOption[];
  ordinaryOptions: PickerOption[];
  signersLoading: boolean;
  /** Kelishuvchilar ALOHIDA so'rovdan keladi — o'z yuklanish holati bilan. */
  ordinaryLoading: boolean;
  creatorOptions: PickerOption[];
  creatorId: number | null;
  onSelectCreator: (v: number | null) => void;
  mainSignerId: number | null;
  onSelectMain: (v: number) => void;
  ordinarySigners: number[];
  onToggleOrdinary: (v: number) => void;

  rahbariyatOptions: PickerOption[];
  rahbariyatLoading: boolean;
  rahbariyatIds: number[];
  onToggleRahbariyat: (v: number) => void;

  submitterOptions: PickerOption[];
  submittersLoading: boolean;
  submitterId: number | null;
  onSelectSubmitter: (v: number) => void;

  regionOptions: PickerOption[];
  branchesLoading: boolean;
  selectedRegionValues: number[];
  onToggleRegion: (v: number) => void;

  destinationOptions: PickerOption[];
  destinationIds: number[];
  onToggleDestination: (v: number) => void;

  letterDate: string;
  departureDate: string | null;
  arrivalDate: string | null;
  onConfirmLetterDate: (v: string) => void;
  onConfirmDepartureDate: (v: string) => void;
  onConfirmArrivalDate: (v: string) => void;
}) {
  const { t } = useTranslation();
  const {
    picker, datePicker, onClosePicker, onCloseDatePicker,
    typeOptions, selectedTypeValue, onSelectType,
    signerOptions, ordinaryOptions, signersLoading, ordinaryLoading, mainSignerId, onSelectMain, ordinarySigners, onToggleOrdinary,
    creatorOptions, creatorId, onSelectCreator,
    rahbariyatOptions, rahbariyatLoading, rahbariyatIds, onToggleRahbariyat,
    submitterOptions, submittersLoading, submitterId, onSelectSubmitter,
    regionOptions, branchesLoading, selectedRegionValues, onToggleRegion,
    destinationOptions, destinationIds, onToggleDestination,
    letterDate, departureDate, arrivalDate,
    onConfirmLetterDate, onConfirmDepartureDate, onConfirmArrivalDate,
  } = props;

  return (
    <>
      <PickerModal visible={picker === 'type'} title={t('letters.pickerType')} options={typeOptions} selected={selectedTypeValue}
        onClose={onClosePicker} onSelect={onSelectType} />

      <PickerModal visible={picker === 'main'} title={t('letters.pickerMainSigner')} options={signerOptions} loading={signersLoading} selected={mainSignerId}
        onClose={onClosePicker} onSelect={onSelectMain} />

      {/* Muallif IXTIYORIY — tanlanmasa joriy foydalanuvchi (backend default),
          shu bois ro'yxat boshida "O'zim" varianti turadi (value 0). */}
      <PickerModal
        visible={picker === 'creator'}
        title={t('letters.pickerCreator')}
        options={[{ value: 0, label: t('letters.creatorSelf') }, ...creatorOptions]}
        loading={ordinaryLoading}
        selected={creatorId ?? 0}
        onClose={onClosePicker}
        onSelect={(v) => onSelectCreator(Number(v) === 0 ? null : Number(v))}
      />
      <PickerModal visible={picker === 'ordinary'} title={t('letters.pickerCoordinators')} options={ordinaryOptions} loading={ordinaryLoading} multiple selected={ordinarySigners}
        onClose={onClosePicker} onSelect={() => {}} onToggle={onToggleOrdinary} />

      <PickerModal visible={picker === 'rahbariyat'} title={t('letters.pickerLeadership')} options={rahbariyatOptions} loading={rahbariyatLoading} multiple selected={rahbariyatIds}
        onClose={onClosePicker} onSelect={() => {}} onToggle={onToggleRahbariyat} />

      <PickerModal visible={picker === 'submitter'} title={t('letters.pickerSubmitter')} options={submitterOptions} loading={submittersLoading} selected={submitterId}
        onClose={onClosePicker} onSelect={onSelectSubmitter} />

      <PickerModal visible={picker === 'regions'} title={t('letters.pickerRegions')} options={regionOptions} loading={branchesLoading} multiple selected={selectedRegionValues}
        onClose={onClosePicker} onSelect={() => {}} onToggle={onToggleRegion} />

      <PickerModal visible={picker === 'destinations'} title={t('letters.pickerDestinations')} options={destinationOptions} loading={branchesLoading} multiple selected={destinationIds}
        onClose={onClosePicker} onSelect={() => {}} onToggle={onToggleDestination} />

      <DatePickerModal visible={datePicker === 'letter'} value={letterDate} title={t('letters.fieldLetterDate')} onClose={onCloseDatePicker} onConfirm={onConfirmLetterDate} />
      <DatePickerModal visible={datePicker === 'departure'} value={departureDate} title={t('letters.fieldDepartureDate')} onClose={onCloseDatePicker} onConfirm={onConfirmDepartureDate} />
      <DatePickerModal visible={datePicker === 'arrival'} value={arrivalDate} title={t('letters.fieldArrivalDate')} onClose={onCloseDatePicker} onConfirm={onConfirmArrivalDate} />
    </>
  );
}
