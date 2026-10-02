// v3 O'quv markazi — web v2 `LearningPage` porti: «Mening kurslarim» (holat,
// progress, muddat, sertifikat) va kurslar katalogi (ochiq yozilish). Darslarni
// ko'rish va yakunlash — tafsilot oynasida. Test topshirish, kurs yaratish/tahrir,
// tayinlash — web'da (menejer bayrog'i serverdan).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  PageHeader,
  ProgressBar,
  Screen,
  SearchField,
  Segmented,
  Skeleton,
  Text,
} from '@/ui';
import { learningCoursesQuery, learningMetaQuery, myEnrollmentsQuery } from '../api/queries';
import { useEnroll } from '../api/mutations';
import { EnrollmentSheet } from '../components/EnrollmentSheet';
import { clampProgress, courseAction } from '../utils/learning';

type Tab = 'my' | 'catalog';

export default function LearningScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('my');
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [viewing, setViewing] = useState<number | null>(null);
  const meta = useQuery(learningMetaQuery());
  const mine = useQuery(myEnrollmentsQuery());
  const catalog = useQuery(
    learningCoursesQuery({ search: debounced, allStates: !!meta.data?.isManager }, tab === 'catalog'),
  );
  const enroll = useEnroll();
  const enrolledIds = new Set((mine.data ?? []).map((e) => e.course_id));
  const active = tab === 'my' ? mine : catalog;

  const doEnroll = async (id: number, title: string) => {
    const ok = await confirm({
      title: t('learning.enroll'),
      message: title,
      confirmLabel: t('learning.enroll'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      await enroll.mutateAsync(id);
      toast.success(t('learning.enrolled'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('learning.enrollFailed')));
    }
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={active.isRefetching} onRefresh={() => void active.refetch()}>
        <PageHeader title={t('learning.title')} subtitle={t('learning.subtitle')} />
        <View style={styles.filters}>
          <Segmented<Tab>
            options={[
              { value: 'my', label: t('learning.tabMy'), count: mine.data?.length },
              { value: 'catalog', label: t('learning.tabCatalog') },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === 'catalog' && (
            <SearchField value={search} onChangeText={setSearch} placeholder={t('learning.searchPlaceholder')} />
          )}
        </View>
        <Card>
          {active.isError ? (
            <ErrorState onRetry={() => active.refetch()} />
          ) : active.isPending ? (
            <Skeleton height={200} />
          ) : tab === 'my' ? (
            (mine.data ?? []).length === 0 ? (
              <EmptyState title={t('learning.emptyMine')} message={t('learning.emptyMineHint')} />
            ) : (
              mine.data!.map((e) => (
                <View key={e.id} style={styles.item}>
                  <ListRow
                    testID={`enrollment-${e.id}`}
                    title={e.course_title ?? '—'}
                    subtitle={
                      [
                        e.score != null ? `${t('learning.score')}: ${e.score}` : null,
                        e.deadline ? `${t('learning.deadline')}: ${e.deadline}` : null,
                        e.certificate_number ? `${t('learning.certificate')}: ${e.certificate_number}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || undefined
                    }
                    right={
                      <Badge label={e.status_label || e.status} tone={e.status === 'completed' ? 'success' : 'brand'} />
                    }
                    onPress={() => setViewing(e.id)}
                  />
                  <ProgressBar value={clampProgress(e.progress) / 100} />
                </View>
              ))
            )
          ) : (catalog.data ?? []).length === 0 ? (
            <EmptyState title={t('learning.emptyCatalog')} />
          ) : (
            catalog.data!.map((c) => {
              const action = courseAction(c, enrolledIds);
              return (
                <ListRow
                  key={c.id}
                  testID={`course-${c.id}`}
                  title={c.title}
                  subtitle={
                    [
                      c.hours ? `${c.hours} ${t('learning.hours')}` : null,
                      c.lesson_count != null ? `${c.lesson_count} ${t('learning.lessons')}` : null,
                      c.is_published === false ? t('learning.draft') : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  }
                  right={
                    action === 'enrolled' ? (
                      <Badge testID={`course-enrolled-${c.id}`} label={t('learning.alreadyEnrolled')} tone="success" />
                    ) : action === 'enroll' ? (
                      <Button
                        testID={`course-enroll-${c.id}`}
                        label={t('learning.enroll')}
                        size="sm"
                        variant="soft"
                        loading={enroll.isPending}
                        onPress={() => void doEnroll(c.id, c.title)}
                      />
                    ) : undefined
                  }
                />
              );
            })
          )}
        </Card>
        <Text variant="caption" tone="subtle" style={styles.note}>
          {t('learning.webOnly')}
        </Text>
      </Screen>
      {viewing !== null && <EnrollmentSheet key={viewing} id={viewing} onClose={() => setViewing(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: { gap: 10, marginBottom: 12 },
  item: { gap: 6, paddingBottom: 8 },
  note: { marginTop: 12 },
});
