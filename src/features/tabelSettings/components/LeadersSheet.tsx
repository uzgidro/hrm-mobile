// Filial rahbarlari varag'i (v2 `BranchLeadersModal`): xodim (server qidiruvi) + rol → saqlanmagan ro'yxatga
// qo'shiladi, mavjud qatorning rolini almashtirish, olib tashlash; «Saqlash» farqni yuboradi (avval olib
// tashlash, keyin qo'shish). Dublikat (xodim + rol) rad etiladi. Sayt master-admini AKT tayinlaganda xodim
// boshqa filialdan ham tanlanadi (v1/v2). Saqlangach `/auth/me` yangilanadi — o'zini tayinlagan foydalanuvchi
// menyusi darhol o'zgaradi. Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { isSiteMasterAdmin } from '@/utils/roles';
import { PickerModal } from '@/components/PickerModal';
import { Avatar, Badge, Button, EmptyState, IconButton, ListRow, SelectField, Sheet, Skeleton, Text } from '@/ui';
import { branchLeadersQuery, leaderCandidatesQuery } from '../api/queries';
import { useSaveLeaders } from '../api/mutations';
import {
  addPending,
  changePendingRole,
  hasLeaderChanges,
  leaderKey,
  leadersDiff,
  removePending,
  roleLabelKey,
  LEADERSHIP_ROLES,
  type BranchLeader,
  type PendingLeader,
  type PickedEmployee,
} from '../utils/leaders';
import type { TabelBranch } from '../utils/tabelConfig';

type Picker = { kind: 'employee' } | { kind: 'role' } | { kind: 'rowRole'; key: string } | null;

export function LeadersSheet({ branch, onClose }: { branch: TabelBranch; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const user = useAuthStore((s) => s.user);
  const leaders = useQuery(branchLeadersQuery(branch.id));
  const save = useSaveLeaders();
  // v2 `useEffect([leaders])`: ro'yxat (qayta) kelganda asl va saqlanmagan ro'yxat undan boshlanadi.
  const [seen, setSeen] = useState<BranchLeader[] | undefined>(undefined);
  const [original, setOriginal] = useState<BranchLeader[]>([]);
  const [pending, setPending] = useState<PendingLeader[]>([]);
  if (leaders.data && leaders.data !== seen) {
    setSeen(leaders.data);
    setOriginal(leaders.data);
    setPending(leaders.data.map((l) => ({ ...l })));
  }
  const [employee, setEmployee] = useState<PickedEmployee | null>(null);
  const [role, setRole] = useState<string>('director');
  const [picker, setPicker] = useState<Picker>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const crossBranch = isSiteMasterAdmin(user) && role === 'akt';
  const candidates = useQuery(leaderCandidatesQuery(branch.id, search, crossBranch, picker?.kind === 'employee'));
  const roleName = (r: string) => {
    const key = roleLabelKey(r);
    return key ? t(key) : r;
  };
  const roleOptions = LEADERSHIP_ROLES.map((r, i) => ({ value: i, label: roleName(r) }));
  const changed = hasLeaderChanges(original, pending);

  const add = () => {
    if (!employee) return;
    const r = addPending(pending, employee, role);
    if (!r.ok) return setError(t(r.error));
    setPending(r.list);
    setEmployee(null);
    setError(null);
  };

  const submit = async () => {
    const { remove } = leadersDiff(original, pending);
    if (remove.length) {
      const ok = await confirm({
        title: t('tabelSettings.leadersTitle'),
        message: t('tabelSettings.leaderRemoveConfirm', { count: remove.length }),
        confirmLabel: t('common.save'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      const res = await save.mutateAsync({ id: branch.id, original, pending });
      if (res.failed) {
        setError(t('tabelSettings.leaderSaveFail'));
        return;
      }
      toast.success(t('tabelSettings.leaderSaved'));
      onClose();
    } catch {
      setError(t('tabelSettings.leaderSaveFail'));
    }
  };

  const renderList = () => {
    if (leaders.isError && !leaders.data) {
      return <EmptyState title={t('tabelSettings.leaderLoadFail')} pose="sad" />;
    }
    if (leaders.isPending) return <Skeleton height={140} />;
    if (!pending.length) return <EmptyState title={t('tabelSettings.leaderEmpty')} />;
    return pending.map((l) => {
      const key = leaderKey(l);
      const name = l.employee?.legal_name ?? `#${l.employee_id}`;
      return (
        <ListRow
          key={key}
          testID={`leader-row-${key}`}
          title={name}
          subtitle={l.employee?.job_position?.name ?? undefined}
          left={<Avatar name={name} uri={l.employee?.photo_thumb_path || l.employee?.photo_path} size={36} />}
          below={
            <View style={styles.badges}>
              <Badge label={roleName(l.leadership_role)} tone="info" />
              {l._new && <Badge label={t('tabelSettings.leaderNew')} tone="success" />}
            </View>
          }
          onPress={() => setPicker({ kind: 'rowRole', key })}
          right={
            <IconButton
              testID={`leader-remove-${key}`}
              icon="trash"
              accessibilityLabel={t('tabelSettings.leaderRemove')}
              onPress={() => {
                setPending((p) => removePending(p, key));
                setError(null);
              }}
            />
          }
        />
      );
    });
  };

  return (
    <Sheet visible onClose={onClose} title={t('tabelSettings.leadersTitle')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="caption" tone="subtle">
          {branch.name || `#${branch.id}`}
        </Text>
        <View style={[styles.addBox, { borderColor: c.border, backgroundColor: c.surface2 }]}>
          <Text variant="label" weight="700">
            {t('tabelSettings.leaderAdd')}
          </Text>
          <SelectField
            testID="leader-employee"
            label={t('tabelSettings.leaderEmployee')}
            value={employee?.legal_name ?? (employee ? `#${employee.id}` : '')}
            placeholder={t('tabelSettings.leaderSelectEmp')}
            icon="search"
            onPress={() => setPicker({ kind: 'employee' })}
          />
          <SelectField
            testID="leader-role"
            label={t('tabelSettings.leaderRole')}
            value={roleName(role)}
            onPress={() => setPicker({ kind: 'role' })}
          />
          <Button
            testID="leader-add"
            label={t('tabelSettings.addSigner')}
            icon="plus"
            variant="soft"
            onPress={add}
            disabled={!employee}
            full
          />
        </View>

        <Text variant="label" weight="700">
          {t('tabelSettings.leaderList')}
        </Text>
        {renderList()}

        {!!error && (
          <Text variant="label" tone="danger" testID="leader-error">
            {error}
          </Text>
        )}
        {changed && (
          <Text variant="caption" tone="subtle" testID="leader-unsaved">
            {t('tabelSettings.unsaved')}
          </Text>
        )}
        <Button
          testID="leader-save"
          label={t('common.save')}
          onPress={() => void submit()}
          loading={save.isPending}
          disabled={!changed}
          full
        />
      </ScrollView>

      {picker?.kind === 'employee' && (
        <PickerModal
          visible
          title={t('tabelSettings.leaderSelectEmp')}
          loading={candidates.isPending}
          options={(candidates.data ?? []).map((e) => ({
            value: e.id,
            label: e.legal_name || `#${e.id}`,
            subLabel: typeof e.job_position === 'object' ? (e.job_position?.name ?? undefined) : undefined,
            photo: e.photo_thumb_path || e.photo_path,
          }))}
          selected={employee?.id ?? null}
          onSearchChange={setSearch}
          onClose={() => setPicker(null)}
          onSelect={(id) => {
            setEmployee((candidates.data ?? []).find((e) => e.id === id) ?? null);
            setError(null);
            setPicker(null);
          }}
        />
      )}
      {(picker?.kind === 'role' || picker?.kind === 'rowRole') && (
        <PickerModal
          visible
          title={t('tabelSettings.leaderRole')}
          options={roleOptions}
          selected={(LEADERSHIP_ROLES as readonly string[]).indexOf(
            picker.kind === 'role' ? role : (pending.find((l) => leaderKey(l) === picker.key)?.leadership_role ?? ''),
          )}
          onClose={() => setPicker(null)}
          onSelect={(i) => {
            const next = LEADERSHIP_ROLES[i]!;
            if (picker.kind === 'role') {
              setRole(next);
            } else {
              const r = changePendingRole(pending, picker.key, next);
              if (r.ok) {
                setPending(r.list);
                setError(null);
              } else setError(t(r.error));
            }
            setPicker(null);
          }}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  addBox: { gap: 10, padding: 12, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
});
