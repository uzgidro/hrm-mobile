// O'quv markazi hub (web v2 `LearningPage`): a «continue learning» card on the
// last touched course, then three tabs — «Mening kurslarim» (progress, deadline,
// certificate; opens the player), «Barcha kurslar» (opens the course page) and,
// for managers only, «Boshqaruv» (drafts and published courses; opens the
// builder). The manager flag is the SERVER's (`/learning/meta`).
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { confirm } from '@/lib/confirm';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  ListRow,
  PageHeader,
  ProgressBar,
  Screen,
  SearchField,
  Segmented,
  Skeleton,
  Text,
} from '@/ui';
import { learningCoursesQuery, learningMetaQuery, myEnrollmentsQuery, type LearningEnrollment } from '../api/queries';
import { useEnroll } from '../api/mutations';
import { CreateCourseSheet } from '../components/CreateCourseSheet';
import { KNOWN_STATUSES, STATUS_TONE, clampProgress, courseAction, deadlineState, fmtDate } from '../utils/learning';

type Tab = 'my' | 'catalog' | 'manage';
type MyFilter = 'all' | 'active' | 'completed' | 'overdue';
type ManageFilter = 'all' | 'draft' | 'published';

const openPlayer = (id: number) => router.push({ pathname: '/kurs-player', params: { id: String(id) } });
const openCourse = (id: number) => router.push({ pathname: '/kurs-detail', params: { id: String(id) } });
const openBuilder = (id: number) => router.push({ pathname: '/kurs-tahrir', params: { id: String(id) } });


export default function LearningScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('my');
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [myFilter, setMyFilter] = useState<MyFilter>('all');
  const [manageFilter, setManageFilter] = useState<ManageFilter>('all');
  const [creating, setCreating] = useState(false);
  const meta = useQuery(learningMetaQuery());
  const isManager = !!meta.data?.isManager;
  const mine = useQuery(myEnrollmentsQuery());
  const catalog = useQuery(learningCoursesQuery({ search: debounced, allStates: false }, tab === 'catalog'));
  const managed = useQuery(learningCoursesQuery({ search: debounced, allStates: true }, tab === 'manage' && isManager));
  const enroll = useEnroll();
  const enrollments = useMemo(() => mine.data ?? [], [mine.data]);
  const enrolledIds = new Set(enrollments.map((e) => e.course_id));
  // «Boshqaruv» exists only for managers; a stale tab falls back to «Mening kurslarim».
  const effTab: Tab = tab === 'manage' && !isManager ? 'my' : tab;
  const active = effTab === 'my' ? mine : effTab === 'catalog' ? catalog : managed;

  const doEnroll = async (id: number, title: string) => {
    const ok = await confirm({
      title: t('learning.enroll'),
      message: title,
      confirmLabel: t('learning.enroll'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      const e = await enroll.mutateAsync(id);
      toast.success(t('learning.enrolled'));
      if (e?.id) openPlayer(e.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('learning.enrollFailed')));
    }
  };

  const myRows = enrollments.filter((e) => {
    if (search.trim() && !(e.course_title ?? '').toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (myFilter === 'active') return e.status !== 'completed';
    if (myFilter === 'completed') return e.status === 'completed';
    if (myFilter === 'overdue') return deadlineState(e) === 'overdue';
    return true;
  });
  const manageRows = (managed.data ?? []).filter((c) =>
    manageFilter === 'draft' ? !c.is_published : manageFilter === 'published' ? !!c.is_published : true,
  );

  return (
    <View style={styles.root}>
      <Screen refreshing={active.isRefetching} onRefresh={() => void active.refetch()}>
        <PageHeader
          title={t('learning.title')}
          subtitle={t('learning.subtitle')}
          right={
            isManager ? (
              <IconButton icon="plus" tone="soft" accessibilityLabel={t('learning.addCourse')} onPress={() => setCreating(true)} testID="learning-add-course" />
            ) : undefined
          }
        />
        <ContinueHero enrollments={enrollments} loading={mine.isPending} onBrowse={() => setTab('catalog')} />
        <View style={styles.filters}>
          <Segmented<Tab>
            options={[
              { value: 'my', label: t('learning.tabMy'), count: mine.data?.length },
              { value: 'catalog', label: t('learning.tabCatalog') },
              ...(isManager ? [{ value: 'manage' as const, label: t('learning.tabManage') }] : []),
            ]}
            value={effTab}
            onChange={setTab}
          />
          <SearchField value={search} onChangeText={setSearch} placeholder={t('learning.searchPlaceholder')} />
          {effTab === 'my' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {(['all', 'active', 'completed', 'overdue'] as const).map((f) => (
                <Chip
                  key={f}
                  label={t(`learning.f_${f}`)}
                  selected={myFilter === f}
                  onPress={() => setMyFilter(f)}
                  testID={`my-filter-${f}`}
                />
              ))}
            </ScrollView>
          )}
          {effTab === 'manage' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {(['all', 'draft', 'published'] as const).map((f) => (
                <Chip
                  key={f}
                  label={t(`learning.f_${f}`)}
                  selected={manageFilter === f}
                  onPress={() => setManageFilter(f)}
                  count={
                    managed.data
                      ? f === 'all'
                        ? managed.data.length
                        : managed.data.filter((c) => (f === 'draft' ? !c.is_published : !!c.is_published)).length
                      : undefined
                  }
                  testID={`manage-filter-${f}`}
                />
              ))}
            </ScrollView>
          )}
        </View>
        <Card>
          {active.isError ? (
            <ErrorState onRetry={() => active.refetch()} />
          ) : active.isPending ? (
            <Skeleton height={200} />
          ) : effTab === 'my' ? (
            myRows.length === 0 ? (
              <EmptyState
                title={enrollments.length ? t('learning.noFiltered') : t('learning.emptyMine')}
                message={enrollments.length ? undefined : t('learning.emptyMineHint')}
                action={enrollments.length ? undefined : { label: t('learning.browseCatalog'), onPress: () => setTab('catalog') }}
              />
            ) : (
              myRows.map((e) => <EnrollmentRow key={e.id} e={e} />)
            )
          ) : effTab === 'catalog' ? (
            (catalog.data ?? []).length === 0 ? (
              <EmptyState title={t('learning.emptyCatalog')} message={t('learning.emptyCatalogHint')} />
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
                        c.provider || t('learning.internalCourse'),
                        c.lesson_count != null ? t('learning.lessonsN', { count: c.lesson_count }) : null,
                        c.hours ? `${c.hours} ${t('learning.hours')}` : null,
                        (c.question_count ?? 0) > 0 ? t('learning.withCertificate') : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || undefined
                    }
                    onPress={() => openCourse(c.id)}
                    right={
                      action === 'enrolled' ? (
                        <Badge testID={`course-enrolled-${c.id}`} label={t('learning.alreadyEnrolled')} tone="success" />
                      ) : action === 'enroll' ? (
                        <Button
                          testID={`course-enroll-${c.id}`}
                          label={t('learning.enroll')}
                          size="sm"
                          variant="soft"
                          loading={enroll.isPending && enroll.variables === c.id}
                          onPress={() => void doEnroll(c.id, c.title)}
                        />
                      ) : (
                        <Badge label={t('learning.byAssignment')} />
                      )
                    }
                  />
                );
              })
            )
          ) : manageRows.length === 0 ? (
            <EmptyState
              title={t('learning.manageEmpty')}
              message={t('learning.manageEmptyHint')}
              action={{ label: t('learning.addCourse'), onPress: () => setCreating(true) }}
            />
          ) : (
            manageRows.map((c) => (
              <ListRow
                key={c.id}
                testID={`manage-course-${c.id}`}
                title={c.title}
                subtitle={[
                  c.section_count != null ? t('learning.sectionsN', { count: c.section_count }) : null,
                  t('learning.lessonsN', { count: c.lesson_count ?? 0 }),
                  (c.question_count ?? 0) > 0 ? t('learning.questionsN', { count: c.question_count ?? 0 }) : null,
                  `${c.completed ?? 0}/${c.enrolled ?? 0} ${t('learning.completedShort')}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => openBuilder(c.id)}
                chevron
                right={<Badge label={c.is_published ? t('learning.published') : t('learning.draft')} tone={c.is_published ? 'success' : 'warning'} />}
              />
            ))
          )}
        </Card>
      </Screen>
      {creating && <CreateCourseSheet onClose={() => setCreating(false)} />}
    </View>
  );
}

function EnrollmentRow({ e }: { e: LearningEnrollment }) {
  const { t } = useTranslation();
  const dl = deadlineState(e);
  return (
    <View style={styles.item}>
      <ListRow
        testID={`enrollment-${e.id}`}
        title={e.course_title ?? '—'}
        subtitle={
          [
            e.lesson_count != null ? t('learning.lessonsN', { count: e.lesson_count }) : null,
            e.score != null ? `${t('learning.score')}: ${e.score}` : null,
            e.deadline && e.status !== 'completed' ? `${t('learning.deadline')}: ${fmtDate(e.deadline)}` : null,
            e.certificate_number ? `${t('learning.certificate')}: ${e.certificate_number}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        right={
          <Badge
            label={
              dl === 'overdue'
                ? t('learning.f_overdue')
                : (KNOWN_STATUSES as readonly string[]).includes(e.status)
                  ? t(`learning.status_${e.status}`)
                  : e.status_label || e.status
            }
            tone={dl === 'overdue' ? 'danger' : dl === 'soon' ? 'warning' : (STATUS_TONE[e.status] ?? 'brand')}
          />
        }
        onPress={() => openPlayer(e.id)}
      />
      <ProgressBar value={clampProgress(e.progress) / 100} />
    </View>
  );
}

/** «O'qishni davom ettiring» on the most recent unfinished enrollment + four counters. */
function ContinueHero({ enrollments, loading, onBrowse }: { enrollments: LearningEnrollment[]; loading: boolean; onBrowse: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  if (loading) return null;
  const activeRows = enrollments.filter((e) => e.status !== 'completed');
  // The new API orders «my» by last activity; the old one does not — sort by it when present.
  const last = activeRows
    .slice()
    .sort((a, b) => String(b.last_activity_at ?? '').localeCompare(String(a.last_activity_at ?? '')))[0];
  const stats = [
    { key: 'active', label: t('learning.statActive'), value: activeRows.length },
    { key: 'done', label: t('learning.statDone'), value: enrollments.filter((e) => e.status === 'completed').length },
    { key: 'certs', label: t('learning.statCerts'), value: enrollments.filter((e) => e.certificate_number).length },
    { key: 'overdue', label: t('learning.statOverdue'), value: enrollments.filter((e) => deadlineState(e) === 'overdue').length },
  ];
  const pct = clampProgress(last?.progress);
  return (
    <View style={styles.heroWrap}>
      <View style={[styles.hero, { backgroundColor: c.brandDeep }]} testID="continue-hero">
        {last ? (
          <>
            <Text variant="caption" style={[styles.kicker, { color: c.fgOnBrand }]}>
              {t('learning.continueLearning')}
            </Text>
            <Text variant="heading" style={{ color: c.fgOnBrand }} numberOfLines={2}>
              {last.course_title ?? '—'}
            </Text>
            <ProgressBar value={pct / 100} color={c.fgOnBrand} />
            <Text variant="caption" style={{ color: c.fgOnBrand }}>
              {[`${pct}%`, last.deadline ? `${t('learning.deadline')}: ${fmtDate(last.deadline)}` : null].filter(Boolean).join(' · ')}
            </Text>
            <Button
              testID="continue-hero-cta"
              label={last.progress ? t('learning.continue') : t('learning.start')}
              variant="white"
              icon="chevronRight"
              onPress={() => openPlayer(last.id)}
            />
          </>
        ) : (
          <>
            <Text variant="heading" style={{ color: c.fgOnBrand }}>
              {t('learning.heroEmptyTitle')}
            </Text>
            <Text variant="caption" style={{ color: c.fgOnBrand }}>
              {t('learning.heroEmptyHint')}
            </Text>
            <Button label={t('learning.browseCatalog')} variant="white" icon="search" onPress={onBrowse} />
          </>
        )}
      </View>
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.key} style={[styles.stat, { backgroundColor: c.surface, borderColor: c.border }]} testID={`stat-${s.key}`}>
            <Text variant="heading" tone={s.key === 'overdue' && s.value > 0 ? 'danger' : 'fg'}>
              {String(s.value)}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: { gap: 10, marginBottom: 12 },
  chips: { gap: 8 },
  item: { gap: 6, paddingBottom: 8 },
  heroWrap: { gap: 10, marginBottom: 14 },
  hero: { borderRadius: radii.xl, padding: 16, gap: 8 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.85 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
});
