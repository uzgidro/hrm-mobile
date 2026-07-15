import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FormInput } from '@/components/FormInput';
import { Icon } from '@/components/Icon';
import { LoadingView } from '@/components/StateViews';
import { PickerModal } from '@/components/PickerModal';
import { fetchAllEmployees, employeesQueryKey } from '@/utils/employees';
import { employeeSubLabel } from '@/utils/roles';
import { getApiErrorMessage } from '@/api/errors';
import type { Employee } from '@/types';
import { getWorkspace, projectKeys } from '../api/queries';
import {
  useCreateWorkspace, useUpdateWorkspace, addWorkspaceMember, removeWorkspaceMember,
} from '../api/mutations';

export default function LoyihaFormScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const wsId = Number(id);
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const qc = useQueryClient();
  const createMut = useCreateWorkspace();
  const updateMut = useUpdateWorkspace(wsId);

  const orgBranchId =
    user?.employee?.organization_branches?.[0]?.id ??
    user?.employee?.department?.organization_branch_id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [initialMemberIds, setInitialMemberIds] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(isEdit);

  const { data: empData } = useQuery({
    queryKey: employeesQueryKey(orgBranchId),
    queryFn: () => fetchAllEmployees(orgBranchId),
    staleTime: 5 * 60 * 1000,
  });
  const employees: Employee[] = empData?.items ?? [];
  const empById = useMemo(() => {
    const m = new Map<number, Employee>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const data = await getWorkspace(wsId);
        setName(data.name ?? '');
        setDescription(data.description ?? '');
        const ids = (data.members ?? []).map((m) => m.member_id).filter((x): x is number => x != null);
        setMemberIds(ids);
        setInitialMemberIds(ids);
      } catch {} finally {
        setHydrating(false);
      }
    })();
  }, [isEdit, wsId]);

  const toggleMember = (id: number) =>
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    if (!name.trim()) { setError(t('projects.nameRequired')); return; }
    setLoading(true);
    const payload = { name: name.trim(), description: description.trim() };
    try {
      let workspaceId = wsId;
      if (isEdit) {
        await updateMut.mutateAsync(payload);
      } else {
        const res = await createMut.mutateAsync(payload);
        workspaceId = res?.id;
      }
      // Sync members (add new, remove dropped) — mirrors the web drawer.
      const current = isEdit ? initialMemberIds : [];
      const toAdd = memberIds.filter((m) => !current.includes(m));
      const toRemove = current.filter((m) => !memberIds.includes(m));
      if (workspaceId) {
        await Promise.all([
          ...toAdd.map((m) => addWorkspaceMember(workspaceId, m)),
          ...toRemove.map((m) => removeWorkspaceMember(workspaceId, m)),
        ]);
      }
      qc.invalidateQueries({ queryKey: projectKeys.all });
      router.back();
    } catch (e) {
      Alert.alert(t('projects.errorTitle'), getApiErrorMessage(e, t('errors.saveFailed')));
    } finally {
      setLoading(false);
    }
  };

  const selectedMembers = memberIds.map((mid) => empById.get(mid)).filter(Boolean) as Employee[];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={isEdit ? t('projects.editTitle') : t('projects.createTitle')} />
      {hydrating ? (
        <LoadingView />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FormInput label={t('projects.nameLabel')} value={name} onChangeText={(v) => { setName(v); setError(''); }} placeholder={t('projects.namePlaceholder')} required error={error} />
          <FormInput label={t('projects.descLabel')} value={description} onChangeText={setDescription} placeholder={t('projects.descPlaceholder')} multiline />

          {/* Loyiha a'zolari */}
          <Text style={styles.label}>{t('projects.membersLabel')}</Text>
          <TouchableOpacity style={styles.memberPick} onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
            <Icon name="users" size={18} color={colors.primary} />
            <Text style={styles.memberPickText}>
              {memberIds.length > 0 ? t('projects.membersSelected', { count: memberIds.length }) : t('projects.membersPlaceholder')}
            </Text>
            <Icon name="chevronRight" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {selectedMembers.length > 0 && (
            <View style={styles.chips}>
              {selectedMembers.map((m) => (
                <View key={m.id} style={styles.chip}>
                  {m.photo_path ? (
                    <Image source={{ uri: m.photo_path }} style={styles.chipAv} />
                  ) : (
                    <View style={[styles.chipAv, styles.chipAvFallback]}>
                      <Text style={styles.chipAvText}>{(m.legal_name || '?').charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.chipName} numberOfLines={1}>{m.legal_name}</Text>
                  <TouchableOpacity onPress={() => toggleMember(m.id)} hitSlop={6}>
                    <Icon name="close" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.hint}>{t('projects.membersHint')}</Text>

          <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.6 }]} onPress={save} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={colors.onPrimary} /> : (
              <>
                <Icon name="check" size={18} color={colors.onPrimary} />
                <Text style={styles.saveText}>{t('common.save')}</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <PickerModal
        visible={pickerOpen}
        title={t('projects.membersLabel')}
        multiple
        selected={memberIds}
        options={employees.map((e) => ({
          value: e.id,
          label: e.legal_name,
          subLabel: employeeSubLabel(e),
          photo: e.photo_path,
        }))}
        onToggle={toggleMember}
        onSelect={toggleMember}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

    label: { fontSize: 13, color: c.textSecondary, fontWeight: '600', marginBottom: 6 },
    memberPick: {
      flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12, paddingHorizontal: 14,
    },
    memberPickText: { flex: 1, fontSize: 15, color: c.text },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 20, paddingVertical: 4, paddingLeft: 4, paddingRight: 10 },
    chipAv: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.skeleton },
    chipAvFallback: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    chipAvText: { fontSize: 10, fontWeight: '700', color: c.primary },
    chipName: { fontSize: 12, color: c.text, fontWeight: '600', maxWidth: 130 },

    hint: { fontSize: 11, color: c.textMuted, marginTop: 10 },
    saveBtn: { flexDirection: 'row', gap: 8, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
    saveText: { color: c.onPrimary, fontSize: 16, fontWeight: '700' },
  });
