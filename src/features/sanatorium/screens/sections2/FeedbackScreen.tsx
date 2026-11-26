// Guest feedback: the registrar sees the summary, the filtered list of answers and can enter a
// paper form; a doctor sees only their own ratings and anonymous comments (a registrar who is
// also a doctor gets both views).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Badge, Button, Card, EmptyState, ListRow, Segmented, StatTile, Text } from '@/ui';
import { feedbackInfinite, feedbackMineQuery, feedbackSummaryQuery } from '../../api/sections2';
import { PagedBlock, QueryBlock, useSanWrite } from '../../components/common';
import { DateField } from '../../components/forms';
import { RatingDistribution } from '../../components/sections2/Charts';
import { FeedbackFilters, PaperFeedbackSheet, SourceBadge } from '../../components/sections2/FeedbackParts';
import { SectionScreen, Stars } from '../../components/sections2/kit';
import { feedbackFilterCount, feedbackParams, ratingTone, type FeedbackFilterDraft } from '../../utils/sections2';
import { fmtDate, fmtDateTime, hasSanRole, todayIso } from '../../utils/sanatorium';
import { useAuthStore } from '@/store/authStore';

const avg = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));
const monthAgo = () => dayjs().subtract(30, 'day').format('YYYY-MM-DD');

export default function FeedbackScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const registrar = hasSanRole(user, 'registrar');
  const doctor = hasSanRole(user, 'doctor');
  const [view, setView] = useState<'all' | 'mine'>(registrar ? 'all' : 'mine');
  const [from, setFrom] = useState<string>(monthAgo());
  const [to, setTo] = useState<string>(todayIso());
  const showAll = registrar && (view === 'all' || !doctor);
  return (
    <SectionScreen title={registrar ? t('sanatorium.s2.feedback') : t('sanatorium.s2.myRatings')} feature="feedback" roles={['registrar', 'doctor']} testID="san-feedback-screen">
      {registrar && doctor && (
        <Segmented testID="fb-view" value={view} onChange={setView} options={[{ value: 'all', label: t('sanCatalog.fb.allTab') }, { value: 'mine', label: t('sanCatalog.fb.mineTab') }]} />
      )}
      <View>
        <DateField label={t('sanatorium.dateFrom')} value={from} onChange={setFrom} testID="fb-from" />
        <DateField label={t('sanatorium.dateTo')} value={to} onChange={setTo} testID="fb-to" />
      </View>
      {showAll ? <RegistrarView from={from} to={to} /> : <DoctorView from={from} to={to} />}
    </SectionScreen>
  );
}

function RegistrarView({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation();
  const canWrite = useSanWrite('registrar');
  const [seg, setSeg] = useState<'summary' | 'list'>('summary');
  const [paper, setPaper] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState<Omit<FeedbackFilterDraft, 'from' | 'to'>>({ min: null, max: null, doctor: null, source: null, q: '' });
  const debouncedQ = useDebouncedValue(filter.q);
  const params = feedbackParams({ ...filter, q: debouncedQ, from, to });
  const summary = useQuery(feedbackSummaryQuery(from, to, seg === 'summary'));
  const list = useInfiniteQuery(feedbackInfinite(params, seg === 'list'));
  const active = feedbackFilterCount({ ...filter, from, to });
  return (
    <>
      <Segmented testID="fb-seg" value={seg} onChange={setSeg} options={[{ value: 'summary', label: t('sanatorium.s2.summary') }, { value: 'list', label: t('sanatorium.s2.answers') }]} />
      {canWrite && <Button testID="fb-add-paper" label={t('sanCatalog.fb.addPaper')} icon="plus" size="sm" variant="soft" onPress={() => setPaper(true)} />}
      {seg === 'summary' ? (
        <QueryBlock query={summary}>
          {(s) => (
            <View style={styles.stack}>
              <View style={styles.tiles}>
                <StatTile label={t('sanatorium.s2.answersCount')} value={s.count} sub={s.prompted ? t('sanCatalog.fb.prompted', { n: s.prompted }) : undefined} icon="checklist" tint="violet" labelLines={2} style={styles.tile} testID="fb-count" />
                <StatTile label={t('sanatorium.s2.avgOverall')} value={avg(s.average_overall)} icon="target" tint="green" style={styles.tile} testID="fb-avg" />
                <StatTile label={t('sanatorium.s2.avgRoom')} value={avg(s.average_room)} icon="building" tint="cyan" style={styles.tile} />
                <StatTile label={t('sanatorium.s2.avgFood')} value={avg(s.average_food)} icon="gift" tint="orange" style={styles.tile} />
                <StatTile label={t('sanatorium.s2.avgStaff')} value={avg(s.average_staff)} icon="users" tint="pink" style={styles.tile} />
              </View>
              <Card title={t('sanatorium.s2.distribution')} icon="chart" tint="violet"><RatingDistribution dist={s.distribution} total={s.count} /></Card>
              {s.doctors.length > 0 && (
                <Card title={t('sanatorium.s2.doctorsRating')} icon="user" tint="drop">
                  {s.doctors.map((d) => <ListRow key={d.ref_id} title={d.name} subtitle={`${d.count} ${t('sanatorium.s2.answersShort')}`} right={<Text variant="heading">{avg(d.average)}</Text>} />)}
                </Card>
              )}
              {s.services.length > 0 && (
                <Card title={t('sanatorium.s2.servicesRating')} icon="gift" tint="orange">
                  {s.services.map((d, i) => <ListRow key={i} title={d.name} subtitle={`${d.count} ${t('sanatorium.s2.answersShort')}`} right={<Text variant="heading">{avg(d.average)}</Text>} />)}
                </Card>
              )}
            </View>
          )}
        </QueryBlock>
      ) : (
        <>
          <Button testID="fb-filters-toggle" label={`${t('sanCatalog.fb.filters')}${active ? ` (${active})` : ''}`} icon="search" size="sm" variant={showFilters || active ? 'soft' : 'ghost'} onPress={() => setShowFilters((v) => !v)} />
          {showFilters && <FeedbackFilters value={{ ...filter, from, to }} onChange={(p) => setFilter((f) => ({ ...f, ...p }))} />}
          {active > 0 && <Button testID="fb-reset" label={t('sanatorium.clearFilters')} size="sm" variant="ghost" onPress={() => setFilter({ min: null, max: null, doctor: null, source: null, q: '' })} />}
          <PagedBlock query={list}>
            {(items, total) =>
              items.length === 0 ? (
                <EmptyState title={t('sanatorium.s2.noFeedback')} />
              ) : (
                <View style={styles.stack}>
                  <Text variant="caption" tone="muted" testID="fb-total">{t('sanCatalog.fb.shown', { n: items.length, total })}</Text>
                  {items.map((f) => (
                    <Card key={f.id} testID={`feedback-${f.id}`}>
                      <View style={styles.head}>
                        <Text variant="heading" style={styles.flex}>{f.guest?.full_name ?? '—'}</Text>
                        <Badge label={`${f.overall}/5`} tone={ratingTone(f.overall)} />
                      </View>
                      <View style={styles.head}>
                        <Stars value={f.overall} />
                        <SourceBadge source={f.source} />
                      </View>
                      <Text variant="caption" tone="muted">
                        {[f.stay ? `${fmtDate(f.stay.planned_from)} → ${fmtDate(f.stay.planned_to)}` : null, f.stay?.room ? `${t('sanatorium.room')} ${f.stay.room}` : null, f.submitted_at ? fmtDateTime(f.submitted_at) : null].filter(Boolean).join(' · ')}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {[f.room_rating ? `${t('sanatorium.s2.avgRoom')}: ${f.room_rating}` : null, f.food_rating ? `${t('sanatorium.s2.avgFood')}: ${f.food_rating}` : null, f.staff_rating ? `${t('sanatorium.s2.avgStaff')}: ${f.staff_rating}` : null].filter(Boolean).join(' · ')}
                      </Text>
                      {!!f.comment && <Text variant="body">{f.comment}</Text>}
                      {f.items.map((it, i) => <Text key={i} variant="caption" tone="muted">{it.name}: {it.rating}/5{it.comment ? ` — ${it.comment}` : ''}</Text>)}
                    </Card>
                  ))}
                </View>
              )
            }
          </PagedBlock>
        </>
      )}
      <PaperFeedbackSheet open={paper} onClose={() => setPaper(false)} />
    </>
  );
}

function DoctorView({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation();
  const q = useQuery(feedbackMineQuery(from, to));
  return (
    <QueryBlock query={q}>
      {(m) => (
        <View style={styles.stack}>
          <View style={styles.tiles}>
            <StatTile label={t('sanatorium.s2.answersCount')} value={m.count} icon="checklist" tint="violet" style={styles.tile} />
            <StatTile label={t('sanatorium.s2.avgOverall')} value={avg(m.average)} icon="target" tint="green" style={styles.tile} testID="fb-mine-avg" />
          </View>
          <Card title={t('sanatorium.s2.distribution')} icon="chart" tint="violet"><RatingDistribution dist={m.distribution} total={m.count} /></Card>
          <Card title={t('sanatorium.s2.comments')} icon="news" tint="pink">
            {m.comments.length === 0 && <Text variant="body" tone="muted">{t('sanatorium.s2.noFeedback')}</Text>}
            {m.comments.map((c, i) => (
              <ListRow key={i} title={c.comment ?? '—'} subtitle={c.month} right={<Badge label={`${c.rating}/5`} tone={ratingTone(c.rating)} />} />
            ))}
          </Card>
        </View>
      )}
    </QueryBlock>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '47%', flexGrow: 1 },
});
