// Analytics (registrar): key numbers, occupancy and arrivals charts, request sources, early
// leaves, revenue, doctors, procedures, feedback and waitlist, plus the Excel export.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SANATORIUM_ANALYTICS_EXPORT } from '@/api/urls';
import { Card, ListRow, StatTile, Text } from '@/ui';
import { analyticsQuery } from '../../api/sections2';
import { QueryBlock } from '../../components/common';
import { DateField } from '../../components/forms';
import { BarChart, ChipWrap, DownloadButton, HBar, SectionScreen } from '../../components/sections2/kit';
import { downsample } from '../../utils/sections2';
import { fmtDate, fmtMoney, todayIso } from '../../utils/sanatorium';

const PRESETS = [7, 30, 90] as const;

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const [days, setDays] = useState<number | 0>(30);
  const [from, setFrom] = useState<string>(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState<string>(todayIso());
  const q = useQuery(analyticsQuery(from, to, to >= from));
  const preset = (n: number) => { setDays(n); setFrom(dayjs().subtract(n, 'day').format('YYYY-MM-DD')); setTo(todayIso()); };
  return (
    <SectionScreen title={t('sanatorium.s2.analytics')} feature="analytics" roles={['registrar']} testID="san-analytics-screen" refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <ChipWrap testID="an-presets" options={PRESETS.map((n) => ({ value: n as number, label: t('sanatorium.s2.lastDays', { n }) }))} isOn={(v) => v === days} onToggle={preset} />
      <DateField label={t('sanatorium.dateFrom')} value={from} onChange={(v) => { setDays(0); setFrom(v); }} testID="an-from" />
      <DateField label={t('sanatorium.dateTo')} value={to} onChange={(v) => { setDays(0); setTo(v); }} testID="an-to" />
      <DownloadButton testID="an-export" label={t('sanatorium.s2.exportExcel')} format="xlsx" url={SANATORIUM_ANALYTICS_EXPORT} params={{ from, to }} filename={`sanatoriy_analitika_${from}_${to}.xlsx`} />
      <QueryBlock query={q}>
        {(a) => {
          const occ = a.occupancy.daily.map((d) => d.percent);
          const maxReq = Math.max(1, ...a.requests.by_source.map((s) => s.total));
          const maxRes = Math.max(1, ...a.early_leave.reasons.map((s) => s.count));
          return (
            <View style={styles.stack}>
              <View style={styles.tiles}>
                <StatTile label={t('sanatorium.s2.avgOccupancy')} value={`${Math.round(a.occupancy.average_percent)}%`} sub={`${t('sanatorium.s2.peak')}: ${Math.round(a.occupancy.peak_percent)}%`} icon="building" tint="cyan" progress={a.occupancy.average_percent / 100} style={styles.tile} testID="an-occupancy" />
                <StatTile label={t('sanatorium.s2.arrivals')} value={a.arrivals.total} icon="arrowDown" tint="drop" style={styles.tile} />
                <StatTile label={t('sanatorium.s2.departures')} value={a.departures.total} icon="arrowUp" tint="amber" style={styles.tile} />
                <StatTile label={t('sanatorium.s2.avgStay')} value={a.average_length_of_stay != null ? a.average_length_of_stay.toFixed(1) : '—'} sub={t('sanatorium.s2.nights')} icon="clock" tint="violet" style={styles.tile} />
              </View>
              <Card title={t('sanatorium.s2.occupancyChart')} icon="chart" tint="cyan" testID="an-occupancy-chart">
                <BarChart values={downsample(occ, 40)} max={100} labels={a.occupancy.daily.length ? [fmtDate(a.occupancy.daily[0]!.date), fmtDate(a.occupancy.daily[a.occupancy.daily.length - 1]!.date)] : undefined} />
              </Card>
              <Card title={t('sanatorium.s2.revenue')} icon="wallet" tint="green" testID="an-revenue">
                <ListRow title={t('sanatorium.s2.accommodationTotal')} right={<Text variant="body">{fmtMoney(a.revenue.accommodation)}</Text>} />
                <ListRow title={t('sanatorium.paidAmount')} right={<Text variant="body">{fmtMoney(a.revenue.accommodation_paid)}</Text>} />
                <ListRow title={t('sanatorium.debt')} right={<Text variant="body">{fmtMoney(a.revenue.accommodation_debt)}</Text>} />
                {a.revenue.services != null && <ListRow title={t('sanatorium.s2.servicesTotal')} right={<Text variant="body">{fmtMoney(a.revenue.services)}</Text>} />}
                {a.revenue.total != null && <ListRow title={t('sanatorium.total')} right={<Text variant="heading">{fmtMoney(a.revenue.total)}</Text>} />}
              </Card>
              <Card title={t('sanatorium.s2.requests')} icon="inbox" tint="pink">
                <Text variant="caption" tone="muted">{a.requests.total} · {t('sanatorium.s2.accepted')}: {a.requests.accepted} · {t('sanatorium.s2.conversion')}: {Math.round(a.requests.conversion_percent)}%</Text>
                {a.requests.by_source.map((s) => <HBar key={s.source} label={t(`sanatorium.source.${s.source}`, { defaultValue: s.source })} value={s.total} max={maxReq} right={`${s.accepted}/${s.total}`} />)}
              </Card>
              <Card title={t('sanatorium.s2.earlyLeaves')} icon="logout" tint="amber">
                <Text variant="caption" tone="muted">{a.early_leave.count} · {Math.round(a.early_leave.rate_percent)}%</Text>
                {a.early_leave.reasons.map((r, i) => <HBar key={i} label={r.reason} value={r.count} max={maxRes} tone="warn" />)}
              </Card>
              {a.doctors.length > 0 && (
                <Card title={t('sanatorium.s2.doctors')} icon="user" tint="violet" testID="an-doctors">
                  {a.doctors.map((d) => <ListRow key={d.staff_id} title={d.name} subtitle={`${d.specialty ?? ''} · ${t('sanatorium.s2.done')}: ${d.done}/${d.total} · ${t('sanatorium.s2.missed')}: ${d.missed}`} right={<Text variant="heading">{d.guests}</Text>} />)}
                </Card>
              )}
              {a.procedures.prescribed.length > 0 && (
                <Card title={t('sanatorium.procedures')} icon="checklist" tint="drop">
                  {a.procedures.prescribed.map((p, i) => <HBar key={i} label={p.name} value={p.sessions_done} max={Math.max(1, p.sessions_total)} right={`${p.sessions_done}/${p.sessions_total}`} />)}
                </Card>
              )}
              {a.feedback && (
                <Card title={t('sanatorium.s2.feedback')} icon="news" tint="pink">
                  <Text variant="body">{a.feedback.count} · {a.feedback.average_overall != null ? a.feedback.average_overall.toFixed(1) : '—'}/5</Text>
                </Card>
              )}
              {a.waitlist && (
                <Card title={t('sanatorium.s2.waitlist')} icon="clock" tint="amber">
                  <Text variant="body">{t('sanatorium.s2.waiting')}: {a.waitlist.waiting_now} · {t('sanatorium.s2.offered')}: {a.waitlist.offered_now} · {t('sanatorium.s2.joined')}: {a.waitlist.joined} · {t('sanatorium.s2.converted')}: {a.waitlist.converted}</Text>
                </Card>
              )}
            </View>
          );
        }}
      </QueryBlock>
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '47%', flexGrow: 1 },
});
