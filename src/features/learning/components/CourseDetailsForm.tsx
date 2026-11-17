// KURS SAHIFASI tab of the builder (web v2 `DetailsForm`): cover, title,
// description, «what you'll learn», settings and deleting the course.
// Cover and outcomes exist only on the new API and are hidden on the old one
// (it would silently drop the outcomes and 404 the cover upload).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { FormInput } from '@/components/FormInput';
import { Icon } from '@/components/Icon';
import { Button, Card, IconButton, Text } from '@/ui';
import { learningMetaQuery, type CourseDetail } from '../api/queries';
import { useDeleteCourse, useRemoveCover, useUpdateCourse, useUploadCover, type CourseBody } from '../api/mutations';
import { hasCurriculumApi, isSafeLink } from '../utils/learning';
import { ChoiceField, SwitchRow } from './fields';

const num = (s: string): number | null => (s.trim() ? Math.max(0, Math.round(Number(s) || 0)) : null);
const str = (v?: number | null) => (v != null ? String(v) : '');
const digits = (v: string) => v.replace(/[^0-9]/g, '');

export function CourseDetailsForm({ course }: { course: CourseDetail }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const newApi = hasCurriculumApi(course);
  const meta = useQuery(learningMetaQuery());
  const update = useUpdateCourse();
  const remove = useDeleteCourse();
  const upload = useUploadCover();
  const dropCover = useRemoveCover();
  const [title, setTitle] = useState(course.title ?? '');
  const [description, setDescription] = useState(course.description ?? '');
  const [outcomes, setOutcomes] = useState<string[]>(course.outcomes?.length ? [...course.outcomes] : ['']);
  const [provider, setProvider] = useState(course.provider ?? '');
  const [type, setType] = useState<string | null>(course.training_type ?? 'course');
  const [hours, setHours] = useState(str(course.hours));
  const [passScore, setPassScore] = useState(str(course.pass_score ?? 60));
  const [validity, setValidity] = useState(str(course.certificate_validity_months));
  const [open, setOpen] = useState(course.is_open_enrollment ?? true);
  const [candidate, setCandidate] = useState(!!course.is_candidate_course);
  const [testMinutes, setTestMinutes] = useState(str(course.test_minutes));
  const [testCount, setTestCount] = useState(str(course.test_question_count));

  const save = async () => {
    if (!title.trim()) return toast.error(t('learning.titleRequired'));
    const body: CourseBody = {
      title: title.trim(),
      description: description.trim() || null,
      provider: provider.trim() || null,
      training_type: type || 'course',
      hours: num(hours),
      pass_score: Math.min(100, num(passScore) ?? 60),
      certificate_validity_months: num(validity),
      is_open_enrollment: open,
      is_candidate_course: candidate,
      test_minutes: num(testMinutes) || null,
      test_question_count: num(testCount) || null,
    };
    if (newApi) body.outcomes = outcomes.map((x) => x.trim()).filter(Boolean);
    try {
      await update.mutateAsync({ id: course.id, body });
      toast.success(t('learning.saved'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('learning.saveFailed')));
    }
  };

  const pickCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [16, 9] });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    try {
      await upload.mutateAsync({
        id: course.id,
        file: { uri: a.uri, name: a.fileName || `cover-${course.id}.jpg`, mimeType: a.mimeType || 'image/jpeg', file: a.file ?? null },
      });
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const del = async () => {
    const ok = await confirm({
      title: t('learning.deleteTitle'),
      message: t('learning.deleteHint', { title: course.title }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(course.id);
      toast.success(t('learning.deleted'));
      router.back();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('learning.deleteFailed')));
    }
  };

  return (
    <View style={styles.stack}>
      <Card title={t('learning.landingCard')} icon="eye" tint="violet">
        {newApi && (
          <View style={styles.cover}>
            {isSafeLink(course.cover_url) ? (
              <Image source={{ uri: course.cover_url }} style={styles.coverImg} contentFit="cover" testID="details-cover" />
            ) : (
              <View style={[styles.coverImg, styles.coverEmpty, { backgroundColor: c.surface2 }]}>
                <Icon name="camera" size={28} color={c.fgMuted} />
              </View>
            )}
            <View style={styles.coverRow}>
              <Button label={t('learning.coverUpload')} icon="camera" variant="soft" size="sm" loading={upload.isPending} onPress={() => void pickCover()} testID="cover-upload" />
              {!!course.cover_url && (
                <Button
                  label={t('learning.coverRemove')}
                  icon="trash"
                  variant="dangerGhost"
                  size="sm"
                  loading={dropCover.isPending}
                  onPress={() =>
                    dropCover.mutate(course.id, { onError: (e) => toast.error(getApiErrorMessage(e, t('errors.generic'))) })
                  }
                  testID="cover-remove"
                />
              )}
            </View>
            <Text variant="caption" tone="subtle">
              {t('learning.coverHint')}
            </Text>
          </View>
        )}
        <FormInput label={t('learning.fieldTitle')} value={title} onChangeText={setTitle} required testID="details-title" />
        <FormInput label={t('learning.fieldDescription')} value={description} onChangeText={setDescription} multiline testID="details-description" />
        <Text variant="caption" tone="subtle" style={styles.hint}>
          {t('learning.descriptionHint')}
        </Text>
        {newApi && (
          <View style={styles.outcomes}>
            <Text variant="label" tone="muted">
              {t('learning.outcomesLabel')}
            </Text>
            <Text variant="caption" tone="subtle">
              {t('learning.outcomesHint')}
            </Text>
            {outcomes.map((o, i) => (
              <View key={i} style={styles.outcomeRow}>
                <View style={styles.flex}>
                  <FormInput
                    label={`${i + 1}`}
                    value={o}
                    onChangeText={(v) => setOutcomes((prev) => prev.map((x, j) => (j === i ? v : x)))}
                    placeholder={t('learning.outcomePlaceholder')}
                    testID={`outcome-${i}`}
                  />
                </View>
                {outcomes.length > 1 && (
                  <IconButton icon="close" accessibilityLabel={t('learning.removeOutcome')} onPress={() => setOutcomes((prev) => prev.filter((_, j) => j !== i))} />
                )}
              </View>
            ))}
            {outcomes.length < 30 && (
              <Button label={t('learning.addOutcome')} icon="plus" variant="link" size="sm" onPress={() => setOutcomes((p) => [...p, ''])} testID="outcome-add" style={styles.start} />
            )}
          </View>
        )}
      </Card>

      <Card title={t('learning.settingsCard')} icon="settings" tint="grey">
        <FormInput label={t('learning.fieldProvider')} value={provider} onChangeText={setProvider} placeholder={t('learning.internalCourse')} testID="details-provider" />
        {(meta.data?.trainingTypes.length ?? 0) > 0 && (
          <View style={styles.field}>
            <ChoiceField
              label={t('learning.fieldType')}
              value={type}
              options={(meta.data?.trainingTypes ?? []).map((x) => ({ value: x.value, label: x.label }))}
              onChange={setType}
              testID="details-type"
            />
          </View>
        )}
        <FormInput label={t('learning.fieldHours')} value={hours} onChangeText={(v) => setHours(digits(v))} keyboardType="number-pad" testID="details-hours" />
        <FormInput label={t('learning.fieldPassScore')} value={passScore} onChangeText={(v) => setPassScore(digits(v))} keyboardType="number-pad" testID="details-pass" />
        <FormInput label={t('learning.fieldCertValidity')} value={validity} onChangeText={(v) => setValidity(digits(v))} keyboardType="number-pad" testID="details-validity" />
        <SwitchRow label={t('learning.openEnrollment')} value={open} onChange={setOpen} testID="details-open" />
        <SwitchRow label={t('learning.candidateEntrance')} value={candidate} onChange={setCandidate} testID="details-candidate" />
        {candidate && (
          <>
            <FormInput label={t('learning.candTestMinutes')} value={testMinutes} onChangeText={(v) => setTestMinutes(digits(v))} keyboardType="number-pad" />
            <FormInput label={t('learning.candTestCount')} value={testCount} onChangeText={(v) => setTestCount(digits(v))} keyboardType="number-pad" />
            <Text variant="caption" tone="subtle">
              {t('learning.candTestHint')}
            </Text>
          </>
        )}
      </Card>

      <Button testID="details-save" label={t('common.save')} icon="check" size="lg" loading={update.isPending} onPress={() => void save()} full />
      <Button testID="details-delete" label={t('learning.deleteCourse')} icon="trash" variant="dangerGhost" loading={remove.isPending} onPress={() => void del()} full />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  cover: { gap: 8, marginBottom: 14 },
  coverImg: { width: '100%', aspectRatio: 16 / 9, borderRadius: radii.md },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  coverRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { marginTop: -8, marginBottom: 12 },
  outcomes: { gap: 6 },
  outcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  start: { alignSelf: 'flex-start' },
  field: { marginBottom: 14 },
});
