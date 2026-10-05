// Ariza kartochkasi (v2 `RegistrationDetail`): surat va shaxsni tasdiqlovchi hujjat ma'lumotlari,
// da'vo qilingan joy, ko'rib chiqilgan bo'lsa — kim/qachon va rad sababi. Kutilayotgan arizada:
// tasdiqlash — administrator HAQIQIY joyni belgilaydi (filial majburiy; bo'lim va lavozim shu filial
// ro'yxatidan — boshqa filialdan tanlansa server `*_branch_mismatch` beradi), rad etish — sabab
// (≥ 3 belgi, arizachiga ko'rinadi) + tasdiq. Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { FormInput } from '@/components/FormInput';
import { PickerModal } from '@/components/PickerModal';
import { departmentOptionsQuery, jobPositionOptionsQuery } from '@/utils/employees';
import { registrationStatusTone } from '@/utils/registrationStatus';
import { isHttpUrl } from '@/utils/safeUrl';
import { formatTashkentDate } from '@/utils/tashkentTime';
import { Badge, Button, SelectField, Sheet, Text } from '@/ui';
import { regBranchesQuery } from '../api/queries';
import { useApproveRegistration, useRejectRegistration } from '../api/mutations';
import {
  buildApproveBody,
  claimText,
  genderKey,
  seedApproveForm,
  validateRejectReason,
  type ApproveForm,
  type RegistrationRow,
} from '../utils/registrations';

type Mode = 'view' | 'approve' | 'reject';
type Picker = null | 'branch' | 'department' | 'position';
const NONE = -1;
const day = (d?: string | null) => (d ? formatTashkentDate(d) : null);

function KeyValue({ label, value, testID }: { label: string; value?: string | null; testID?: string }) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.kv, { borderBottomColor: c.border }]}>
      <Text variant="caption" tone="muted" style={styles.kvLabel}>
        {label}
      </Text>
      <Text variant="body" style={styles.kvValue} testID={testID}>
        {value || '—'}
      </Text>
    </View>
  );
}

export function RegistrationSheet({ row, onClose }: { row: RegistrationRow; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [mode, setMode] = useState<Mode>('view');
  const [form, setForm] = useState<ApproveForm>(() => seedApproveForm(row));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const approve = useApproveRegistration();
  const reject = useRejectRegistration();
  const approving = mode === 'approve';
  // Ro'yxatlar TAYINLANAYOTGAN filial bo'yicha (v2): boshqa filial bo'limi tasdiqni yiqitadi.
  const branches = useQuery(regBranchesQuery(approving));
  const branchId = form.branchId ?? undefined;
  const depts = useQuery({ ...departmentOptionsQuery(branchId), enabled: approving && form.branchId != null });
  const positions = useQuery({ ...jobPositionOptionsQuery(branchId), enabled: approving });
  const pending = row.status === 'pending';
  const name = row.full_name || t('registrations.title');

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
  };
  const set = (p: Partial<ApproveForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setError(null);
  };

  const doApprove = async () => {
    const r = buildApproveBody(form);
    if (!r.ok) return setError(t(r.error));
    try {
      await approve.mutateAsync({ id: row.id, body: r.body });
      toast.success(t('registrations.approved'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('registrations.actionFailed')));
    }
  };

  const doReject = async () => {
    const v = validateRejectReason(reason);
    if (!v.ok) return setError(t(v.error));
    const ok = await confirm({
      title: t('registrations.reject'),
      message: name,
      confirmLabel: t('registrations.confirmReject'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await reject.mutateAsync({ id: row.id, reason: v.reason });
      toast.success(t('registrations.rejected'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('registrations.actionFailed')));
    }
  };

  const nameIn = (
    list: { id: number; name?: string | null }[] | undefined,
    id: number | null,
    fallback?: string | null,
  ) => (id == null ? '' : (list?.find((x) => x.id === id)?.name ?? fallback ?? `#${id}`));
  const branchName = nameIn(
    branches.data,
    form.branchId,
    form.branchId === row.claimed_branch_id ? row.claimed_branch_name : null,
  );
  const deptName = nameIn(
    depts.data,
    form.departmentId,
    form.departmentId === row.claimed_department_id ? row.claimed_department_name : null,
  );
  const posName = nameIn(
    positions.data,
    form.positionId,
    form.positionId === row.claimed_job_position_id ? row.claimed_job_position_name : null,
  );

  const pickerProps = (() => {
    const none = { value: NONE, label: t('registrations.notSelected') };
    if (picker === 'branch') {
      return {
        title: t('registrations.branch'),
        options: (branches.data ?? []).map((b) => ({ value: b.id, label: b.name || `#${b.id}` })),
        loading: branches.isFetching,
        selected: form.branchId,
        // Ikkala ro'yxat filialga bog'liq — eski filialdan qolgan id server tekshiruvidan o'tmaydi.
        onSelect: (id: number) => set({ branchId: id, departmentId: null, positionId: null }),
      };
    }
    if (picker === 'department') {
      return {
        title: t('registrations.department'),
        options: [none, ...(depts.data ?? []).map((d) => ({ value: d.id, label: d.name }))],
        loading: depts.isFetching,
        selected: form.departmentId ?? NONE,
        onSelect: (id: number) => set({ departmentId: id === NONE ? null : id }),
      };
    }
    return {
      title: t('registrations.position'),
      options: [none, ...(positions.data ?? []).map((p) => ({ value: p.id, label: p.name }))],
      loading: positions.isFetching,
      selected: form.positionId ?? NONE,
      onSelect: (id: number) => set({ positionId: id === NONE ? null : id }),
    };
  })();

  const gender = genderKey(row.gender);
  const reviewed = day(row.reviewed_at);
  const photo = isHttpUrl(row.photo_url) ? row.photo_url : null;

  return (
    <Sheet visible onClose={onClose} title={name}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {mode === 'view' && (
          <>
            <View style={styles.head}>
              {photo ? (
                <Pressable
                  testID="registration-photo"
                  accessibilityRole="imagebutton"
                  accessibilityLabel={t('registrations.photo')}
                  onPress={() => void Linking.openURL(photo)}
                >
                  <Image source={{ uri: photo }} style={[styles.photo, { borderColor: c.border }]} />
                </Pressable>
              ) : (
                <View style={[styles.photo, styles.noPhoto, { borderColor: c.border }]}>
                  <Text variant="caption" tone="subtle">
                    {t('registrations.noPhoto')}
                  </Text>
                </View>
              )}
              <View style={styles.headText}>
                <Badge
                  testID="registration-status"
                  label={t(`registrations.status_${row.status}`, { defaultValue: row.status })}
                  tone={registrationStatusTone(row.status)}
                />
                {!!reviewed && (
                  <Text variant="caption" tone="subtle" testID="registration-reviewed">
                    {`${t('registrations.colReviewed')}: ${reviewed}${row.reviewed_by_name ? ` · ${row.reviewed_by_name}` : ''}`}
                  </Text>
                )}
              </View>
            </View>
            <KeyValue label={t('registrations.username')} value={row.username} />
            <KeyValue label={t('registrations.email')} value={row.email} />
            <KeyValue label={t('registrations.phone')} value={row.phone_number} />
            <KeyValue label={t('registrations.birthDate')} value={day(row.birth_date)} testID="registration-birth" />
            <KeyValue label={t('registrations.gender')} value={gender ? t(`registrations.${gender}`) : null} />
            <KeyValue label={t('registrations.pinfl')} value={row.pinfl} />
            <KeyValue label={t('registrations.inn')} value={row.inn} />
            <KeyValue label={t('registrations.passport')} value={row.passport_number} />
            <KeyValue label={t('registrations.passportIssuedBy')} value={row.passport_issued_by} />
            <KeyValue label={t('registrations.passportIssueDate')} value={day(row.passport_issue_date)} />
            <KeyValue label={t('registrations.passportExpiryDate')} value={day(row.passport_expiry_date)} />
            <KeyValue label={t('registrations.birthPlace')} value={row.birth_place} />
            <KeyValue label={t('registrations.birthCountry')} value={row.birth_country_name} />
            <KeyValue label={t('registrations.nationality')} value={row.nationality_name} />
            <KeyValue label={t('registrations.citizenship')} value={row.citizenship_name} />
            <KeyValue label={t('registrations.address')} value={row.address} />
            <KeyValue
              label={t('registrations.colClaim')}
              value={claimText(row, t('registrations.guest'))}
              testID="registration-claim"
            />
            {!!row.reject_reason && <KeyValue label={t('registrations.rejectReason')} value={row.reject_reason} />}
            {pending && (
              <View style={styles.actions}>
                <Button
                  testID="registration-approve"
                  label={t('registrations.approve')}
                  icon="check"
                  onPress={() => switchMode('approve')}
                  full
                />
                <Button
                  testID="registration-reject"
                  label={t('registrations.reject')}
                  icon="close"
                  variant="dangerGhost"
                  onPress={() => switchMode('reject')}
                  full
                />
              </View>
            )}
          </>
        )}

        {mode === 'approve' && (
          <>
            <Text variant="body" tone="muted">
              {t('registrations.approveHint')}
            </Text>
            <SelectField
              testID="registration-branch"
              label={`${t('registrations.branch')} *`}
              value={branchName}
              placeholder={t('registrations.notSelected')}
              icon="building"
              onPress={() => setPicker('branch')}
            />
            <SelectField
              testID="registration-department"
              label={t('registrations.department')}
              value={deptName}
              placeholder={t('registrations.notSelected')}
              disabled={form.branchId == null}
              onPress={() => setPicker('department')}
            />
            <SelectField
              testID="registration-position"
              label={t('registrations.position')}
              value={posName}
              placeholder={t('registrations.notSelected')}
              onPress={() => setPicker('position')}
            />
            {!!error && (
              <Text variant="label" tone="danger" testID="registration-error">
                {error}
              </Text>
            )}
            <Button
              testID="registration-approve-submit"
              label={t('registrations.confirmApprove')}
              onPress={() => void doApprove()}
              loading={approve.isPending}
              full
            />
            <Button label={t('common.cancel')} variant="ghost" onPress={() => switchMode('view')} full />
          </>
        )}

        {mode === 'reject' && (
          <>
            <FormInput
              testID="registration-reason"
              label={t('registrations.rejectReason')}
              value={reason}
              onChangeText={(v) => {
                setReason(v);
                setError(null);
              }}
              multiline
              required
            />
            <Text variant="caption" tone="subtle" style={styles.hint}>
              {t('registrations.rejectHint')}
            </Text>
            {!!error && (
              <Text variant="label" tone="danger" testID="registration-error">
                {error}
              </Text>
            )}
            <Button
              testID="registration-reject-submit"
              label={t('registrations.confirmReject')}
              variant="danger"
              onPress={() => void doReject()}
              loading={reject.isPending}
              full
            />
            <Button label={t('common.cancel')} variant="ghost" onPress={() => switchMode('view')} full />
          </>
        )}
      </ScrollView>
      {picker && (
        <PickerModal
          visible
          {...pickerProps}
          onClose={() => setPicker(null)}
          onSelect={(id) => {
            setPicker(null);
            pickerProps.onSelect(id);
          }}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  head: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 4 },
  headText: { flex: 1, gap: 6, alignItems: 'flex-start' },
  photo: { width: 96, height: 122, borderRadius: radii.sm, borderWidth: 1 },
  noPhoto: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  kv: { flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  kvLabel: { width: '42%' },
  kvValue: { flex: 1 },
  actions: { gap: 10, marginTop: 6 },
  hint: { marginTop: -12 },
});
