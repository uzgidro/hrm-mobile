import { useTranslation } from 'react-i18next';
import { PickerModal, type PickerOption } from '@/components/PickerModal';

export type PickerKind = 'category' | 'leadership' | 'submitter' | 'familiarizers' | null;

// All five picker modals of the create-order form, grouped so the screen body
// stays composition-only. Selection state stays in the screen; this only wires
// each modal's visibility + option source + callbacks.
export function OrderPickers({
  picker, onClosePicker,
  approverPickerIndex, onCloseApproverPicker,
  categoryOptions, categoryId, catsLoading, onSelectCategory,
  leadershipOptions, leadershipId, leadershipLoading, onSelectLeadership,
  employeeOptions, empsLoading,
  submitterId, onSelectSubmitter,
  departmentOptions, deptsLoading, familiarizerDeptIds, onToggleFamiliarizer,
  approverSelectedId, onSelectApprover,
}: {
  picker: PickerKind; onClosePicker: () => void;
  approverPickerIndex: number | null; onCloseApproverPicker: () => void;
  categoryOptions: PickerOption[]; categoryId: number | null; catsLoading: boolean; onSelectCategory: (v: number) => void;
  leadershipOptions: PickerOption[]; leadershipId: number | null; leadershipLoading: boolean; onSelectLeadership: (v: number) => void;
  employeeOptions: PickerOption[]; empsLoading: boolean;
  submitterId: number | null; onSelectSubmitter: (v: number) => void;
  departmentOptions: PickerOption[]; deptsLoading: boolean; familiarizerDeptIds: number[]; onToggleFamiliarizer: (v: number) => void;
  approverSelectedId: number | null; onSelectApprover: (v: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <PickerModal
        visible={picker === 'category'} title={t('orders.pickCategory')} options={categoryOptions}
        loading={catsLoading} selected={categoryId}
        onClose={onClosePicker}
        onSelect={onSelectCategory}
      />
      <PickerModal
        visible={picker === 'leadership'} title={t('orders.pickLeadership')} options={leadershipOptions}
        loading={leadershipLoading} selected={leadershipId}
        onClose={onClosePicker}
        onSelect={onSelectLeadership}
      />
      <PickerModal
        visible={picker === 'submitter'} title={t('orders.pickSubmitter')} options={employeeOptions}
        loading={empsLoading} selected={submitterId}
        onClose={onClosePicker}
        onSelect={onSelectSubmitter}
      />
      <PickerModal
        visible={picker === 'familiarizers'} title={t('orders.pickFamiliarizerDepts')} options={departmentOptions}
        loading={deptsLoading} multiple selected={familiarizerDeptIds}
        onClose={onClosePicker}
        onSelect={() => {}}
        onToggle={onToggleFamiliarizer}
      />
      <PickerModal
        visible={approverPickerIndex !== null} title={t('orders.pickApprover')} options={employeeOptions}
        loading={empsLoading} selected={approverSelectedId}
        onClose={onCloseApproverPicker}
        onSelect={onSelectApprover}
      />
    </>
  );
}
