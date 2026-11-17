// New course — only the NAME is required (TalentLMS rule); everything else is
// filled in the builder, which opens right after the draft is created.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { useBranchStore } from '@/store/branchStore';
import { FormInput } from '@/components/FormInput';
import { Button, Sheet, Text } from '@/ui';
import { ChoiceField } from './fields';
import { learningMetaQuery } from '../api/queries';
import { useCreateCourse } from '../api/mutations';

export function CreateCourseSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const meta = useQuery(learningMetaQuery());
  const branch = useBranchStore((s) => s.selected);
  const create = useCreateCourse();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<string | null>('course');
  const types = meta.data?.trainingTypes ?? [];

  const submit = async () => {
    if (!title.trim()) return;
    try {
      const c = await create.mutateAsync({
        title: title.trim(),
        training_type: type || 'course',
        // The selected branch, as on the web; null = open to every branch.
        organization_branch_id: typeof branch === 'number' ? branch : null,
        // The new API refuses to create a published course (409); drafts work on both.
        is_published: false,
        pass_score: 60,
        is_open_enrollment: true,
      });
      toast.success(t('learning.created'));
      onClose();
      if (c?.id) router.push({ pathname: '/kurs-tahrir', params: { id: String(c.id) } });
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('learning.saveFailed')));
    }
  };

  return (
    <Sheet scroll visible onClose={onClose} title={t('learning.addCourse')}>
      <View style={styles.body}>
        <Text variant="caption" tone="muted">
          {t('learning.createHint')}
        </Text>
        <FormInput
          label={t('learning.fieldTitle')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('learning.titlePlaceholder')}
          required
          testID="create-course-title"
        />
        {types.length > 0 && (
          <ChoiceField
            label={t('learning.fieldType')}
            value={type}
            options={types.map((x) => ({ value: x.value, label: x.label }))}
            onChange={setType}
            testID="create-course-type"
          />
        )}
        <Button
          testID="create-course-submit"
          label={t('learning.createAndBuild')}
          icon="plus"
          loading={create.isPending}
          disabled={!title.trim()}
          onPress={() => void submit()}
          full
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 4, paddingBottom: 8 },
});
