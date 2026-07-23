import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { FormInput } from '@/components/FormInput';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PickerModal, type PickerOption } from '@/components/PickerModal';
import { getApiErrorMessage } from '@/api/errors';
import { newsBranchesQuery } from '../api/queries';
import { useCreateNewsPost } from '../api/mutations';

export default function NewsFormScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const createM = useCreateNewsPost();

  const { data: branches = [], isLoading: branchesLoading } = useQuery(newsBranchesQuery(pickerOpen));
  const branchOptions = useMemo<PickerOption[]>(
    () => branches.map((b) => ({ value: b.id, label: b.name })),
    [branches],
  );
  const branchName = branches.find((b) => b.id === branchId)?.name;

  const submit = () => {
    if (!title.trim()) {
      Alert.alert(t('news.errorTitle'), t('news.titleRequired'));
      return;
    }
    createM.mutate(
      { title, description, organization_branch_id: branchId },
      {
        onSuccess: () => { Alert.alert(t('news.created'), ''); router.back(); },
        onError: (e) => Alert.alert(t('news.errorTitle'), getApiErrorMessage(e, t('news.errorTitle'))),
      },
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title={t('news.createTitle')} />
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

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={createM.isPending} activeOpacity={0.85}>
          {createM.isPending
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
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingBottom: 32 },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 8, marginTop: 8 },
    selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 13 },
    selectorText: { fontSize: 14, color: c.text },
    selectorPlaceholder: { color: c.textMuted },
    clearBranch: { fontSize: 12, color: c.primary, marginTop: 6 },
    submitBtn: { marginTop: 20, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    submitText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
  });
