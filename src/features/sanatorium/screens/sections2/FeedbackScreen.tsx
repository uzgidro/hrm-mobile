// Guest feedback: the registrar sees the summary and the list of answers; a doctor sees only
// their own ratings and anonymous comments.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Card, EmptyState, ListRow, Segmented, StatTile, Text } from '@/ui';
import { feedbackInfinite, feedbackMineQuery, feedbackSummaryQuery } from '../../api/sections2';
import { PagedBlock, QueryBlock } from '../../components/common';
import { DateField } from '../../components/forms';
import { ChipWrap, HBar, SectionScreen, Stars } from '../../components/sections2/kit';
import { fmtDate, hasSanRole, todayIso } from '../../utils/sanatorium';
import { useAuthStore } from '@/store/authStore';

const avg = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));

export default function FeedbackScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const registrar = hasSanRole(user, 'registrar');
  const [from, setFrom] = useState<string>(dayjs().subtract(90, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState<string>(todayIso());
  return (
    <SectionScreen title={registrar ? t('sanatorium.s2.feedback') : t('sanatorium.s2.myRatings')} feature="feedback" roles={['registrar', 'doctor']} testID="san-feedback-screen">
      <View>
        <DateField label={t('sanatorium.dateFrom')} value={from} onChange={setFrom} testID="fb-from" />
        <DateField label={t('sanatorium.dateTo')} value={to} onChange={setTo} testID="fb-to" />
      </View>
      {registrar ? <RegistrarView from={from} to={to} /> : <DoctorView from={from} to={to} />}
    </SectionScreen>
  );
}

function Distribution({ dist, total }: { dist: Record<string, number>; total: number }) {
  return (
    <View>
      {[5, 4, 3, 2, 1].map((n) => <HBar key={n} label={'★'.repeat(n)} value={dist[String(n)] ?? 0} max={Math.max(1, total)} tone={n <= 2 ? 'warn' : 'brand'} />)}
    </View>
  );
}

function RegistrarView({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation();
  const [seg, setSeg] = useState<'summary' | 'list'>('summary');
  const [low, setLow] = useState(false);
  const summary = useQuery(feedbackSummaryQuery(from, to, seg === 'summary'));
  const list = useInfiniteQuery(feedbackInfinite({ from, to, ...(low ? { max_overall: 2 } : {}) }, seg === 'list'));
  return (
    <>
      <Segmented testID="fb-seg" value={seg} onChange={setSeg} options={[{ value: 'summary', label: t('sanatorium.s2.summary') }, { value: 'list', label: t('sanatorium.s2.answers') }]} />
      {seg === 'summary' ? (
        <QueryBlock query={summary}>
          {(s) => (
            <View style={styles.stack}>
              <View style={styles.tiles}>
                <StatTile label={t('sanatorium.s2.answersCount')} value={s.count} icon="checklist" tint="violet" style={styles.tile} />
                <StatTile label={t('sanatorium.s2.avgOverall')} value={avg(s.average_overall)} icon="target" tint="green" style={styles.tile} testID="fb-avg" />
                <StatTile label={t('sanatorium.s2.avgRoom')} value={avg(s.average_room)} icon="building" tint="cyan" style={styles.tile} />
                <StatTile label={t('sanatorium.s2.avgFood')} value={avg(s.average_food)} icon="gift" tint="orange" style={styles.tile} />
                <StatTile label={t('sanatorium.s2.avgStaff')} value={avg(s.average_staff)} icon="users" tint="pink" style={styles.tile} />
              </View>
              <Card title={t('sanatorium.s2.distribution')} icon="chart" tint="violet"><Distribution dist={s.distribution} total={s.count} /></Card>
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
          <ChipWrap options={[{ value: 'low', label: t('sanatorium.s2.lowOnly') }]} isOn={() => low} onToggle={() => setLow((v) => !v)} testID="fb-low" />
          <PagedBlock query={list}>
            {(items) =>
              items.length === 0 ? (
                <EmptyState title={t('sanatorium.s2.noFeedback')} />
              ) : (
                <View style={styles.stack}>
                  {items.map((f) => (
                    <Card key={f.id} testID={`feedback-${f.id}`}>
                      <View style={styles.head}>
                        <Text variant="heading" style={styles.flex}>{f.guest?.full_name ?? '—'}</Text>
                        <Badge label={`${f.overall}/5`} tone={f.overall <= 2 ? 'danger' : f.overall >= 4 ? 'success' : 'warning'} />
                      </View>
                      <Stars value={f.overall} />
                      <Text variant="caption" tone="muted">
                        {[f.stay ? `${fmtDate(f.stay.planned_from)} → ${fmtDate(f.stay.planned_to)}` : null, f.stay?.room ? `${t('sanatorium.room')} ${f.stay.room}` : null, f.submitted_at ? fmtDate(f.submitted_at) : null].filter(Boolean).join(' · ')}
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
          <Card title={t('sanatorium.s2.distribution')} icon="chart" tint="violet"><Distribution dist={m.distribution} total={m.count} /></Card>
          <Card title={t('sanatorium.s2.comments')} icon="news" tint="pink">
            {m.comments.length === 0 && <Text variant="body" tone="muted">{t('sanatorium.s2.noFeedback')}</Text>}
            {m.comments.map((c, i) => (
              <ListRow key={i} title={c.comment ?? '—'} subtitle={fmtDate(c.date)} right={<Badge label={`${c.rating}/5`} tone={c.rating <= 2 ? 'danger' : 'success'} />} />
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
