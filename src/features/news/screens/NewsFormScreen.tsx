import { useMemo, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { FormInput } from '@/components/FormInput';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PickerModal, type PickerOption } from '@/components/PickerModal';
import { getApiErrorMessage } from '@/api/errors';
import { newsBranchesQuery, newsDetailQuery } from '../api/queries';
import { useCreateNewsPost, useUpdateNewsPost } from '../api/mutations';

export default function NewsFormScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // `?id=` → edit mode (web NewsPage edit modal parity). The form seeds from
  // the post once, at render time (no effect+setState), keyed by post id.
  const { id: editIdParam } = useLocalSearchParams<{ id?: string }>();
  const editId = editIdParam ? Number(editIdParam) : null;
  const { data: editing } = useQuery({ ...newsDetailQuery(editId ?? 0), enabled: !!editId });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [seededFor, setSeededFor] = useState<number | null>(null);
  if (editing && seededFor !== editing.id) {
    setSeededFor(editing.id);
    setTitle(editing.title ?? '');
    setDescription(editing.description ?? '');
    setBranchId(editing.organization_branch_id ?? null);
  }
  const createM = useCreateNewsPost();
  const updateM = useUpdateNewsPost(editId ?? 0);
  const busy = createM.isPending || updateM.isPending;

  const { data: branches = [], isLoading: branchesLoading } = useQuery(newsBranchesQuery(pickerOpen));
  const branchOptions = useMemo<PickerOption[]>(
    () => branches.map((b) => ({ value: b.id, label: b.name })),
    [branches],
  );
  const branchName = branches.find((b) => b.id === branchId)?.name;

  const submit = () => {
    if (!title.trim()) {
      Alert.alert(t('common.errorTitle'), t('news.titleRequired'));
      return;
    }
    const form = { title, description, organization_branch_id: branchId };
    const opts = {
      onSuccess: () => { Alert.alert(t(editId ? 'news.updated' : 'news.created'), ''); router.back(); },
      onError: (e: unknown) => Alert.alert(t('common.errorTitle'), getApiErrorMessage(e, t('common.errorTitle'))),
    };
    if (editId) updateM.mutate(form, opts);
    else createM.mutate(form, opts);
  };

  return (
    <Screen edges={['top', 'bottom']} maxWidth={640}>
      <ScreenHeader title={t(editId ? 'news.editTitle' : 'news.createTitle')} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormInput
          label={t('news.titleLabel')}
          required
          value={title}
          onChangeText={setTitle}
          placeholder={t('news.titlePlaceholder')}
        />
        <FormInput
          label={t('news.descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('news.descriptionPlaceholder')}
          multiline
        />

        <Text style={styles.label}>{t('news.branchLabel')}</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
          <Text style={[styles.selectorText, !branchName && styles.selectorPlaceholder]}>
            {branchName || t('news.branchAllOption')}
          </Text>
          <Icon name="chevronRight" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        {branchId != null && (
          <TouchableOpacity onPress={() => setBranchId(null)} hitSlop={8}>
            <Text style={styles.clearBranch}>{t('news.branchAllOption')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={busy} activeOpacity={0.85}>
          {busy
            ? <ActivityIndicator color={colors.onPrimary} />
            : <Text style={styles.submitText}>{t('news.save')}</Text>}
        </TouchableOpacity>
      </ScrollView>

      <PickerModal
        visible={pickerOpen}
        title={t('news.branchLabel')}
        options={branchOptions}
        loading={branchesLoading}
        selected={branchId}
        onClose={() => setPickerOpen(false)}
        onSelect={(v) => { setBranchId(v); setPickerOpen(false); }}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 32 },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 8, marginTop: 8 },
    selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 13 },
    selectorText: { fontSize: 14, color: c.text },
    selectorPlaceholder: { color: c.textMuted },
    clearBranch: { fontSize: 12, color: c.primary, marginTop: 6 },
    submitBtn: { marginTop: 20, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    submitText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
  });
