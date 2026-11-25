// Analytics (registrar): key numbers, occupancy / flow / request / doctor charts, early leaves,
// revenue, procedures, feedback and waitlist, plus the Excel export (periods up to a year).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SANATORIUM_ANALYTICS_EXPORT } from '@/api/urls';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, ListRow, StatTile, Text } from '@/ui';
import { analyticsQuery, type Analytics } from '../../api/sections2';
import { QueryBlock } from '../../components/common';
import { DateField, ErrorLine } from '../../components/forms';
import { ColumnChart, GroupedColumns, OverlayRows, RatingDistribution, StackedRows } from '../../components/sections2/Charts';
import { ChipWrap, DownloadButton, HBar, SectionScreen } from '../../components/sections2/kit';
import { ANALYTICS_PRESETS, bucketSeries, presetRange, procRoomUsage, rangeTooLong, topRows } from '../../utils/sections2';
import { fmtMoney, todayIso } from '../../utils/sanatorium';

type Mode = number | 'custom';
const dm = (d: string) => dayjs(d).format('DD.MM');

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>(30);
  const [{ from, to }, setRange] = useState(() => presetRange(30, todayIso()));
  const tooLong = rangeTooLong(from, to);
  const valid = to >= from && !tooLong;
  const q = useQuery(analyticsQuery(from, to, valid));
  const pick = (m: Mode) => {
    setMode(m);
    if (m !== 'custom') setRange(presetRange(m, todayIso()));
  };
  return (
    <SectionScreen title={t('sanatorium.s2.analytics')} feature="analytics" roles={['registrar']} testID="san-analytics-screen" refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <ChipWrap
        testID="an-presets"
        options={[...ANALYTICS_PRESETS.map((n) => ({ value: n as Mode, label: t('sanatorium.s2.lastDays', { n }) })), { value: 'custom' as Mode, label: t('sanCatalog.an.custom') }]}
        isOn={(v) => v === mode}
        onToggle={pick}
      />
      {mode === 'custom' && (
        <>
          <DateField label={t('sanatorium.dateFrom')} value={from} onChange={(v) => setRange((r) => ({ ...r, from: v }))} testID="an-from" />
          <DateField label={t('sanatorium.dateTo')} value={to} onChange={(v) => setRange((r) => ({ ...r, to: v }))} testID="an-to" />
        </>
      )}
      {to < from && <ErrorLine message={t('sanatorium.errors.invalid_period')} testID="an-period-error" />}
      {tooLong && <ErrorLine message={t('sanCatalog.an.tooLong')} testID="an-too-long" />}
      <DownloadButton testID="an-export" label={t('sanatorium.s2.exportExcel')} format="xlsx" disabled={!valid} url={SANATORIUM_ANALYTICS_EXPORT} params={{ from, to }} filename={`sanatoriy_analitika_${from}_${to}.xlsx`} />
      {valid && <QueryBlock query={q}>{(a) => <Body a={a} />}</QueryBlock>}
    </SectionScreen>
  );
}

function Body({ a }: { a: Analytics }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const occ = bucketSeries(a.occupancy.daily.map((d) => d.percent), a.occupancy.daily.map((d) => dm(d.date)), 36, 'avg');
  const dep = new Map(a.departures.daily.map((d) => [d.date, d.count ?? 0]));
  const flow = {
    arrivals: bucketSeries(a.arrivals.daily.map((d) => d.count ?? 0), a.arrivals.daily.map((d) => dm(d.date)), 20, 'sum'),
    departures: bucketSeries(a.arrivals.daily.map((d) => dep.get(d.date) ?? 0), a.arrivals.daily.map((d) => dm(d.date)), 20, 'sum'),
  };
  const maxRes = Math.max(1, ...a.early_leave.reasons.map((s) => s.count));
  const revenueTotal = a.revenue.total ?? a.revenue.accommodation;
  const rooms = procRoomUsage(a.procedures.rooms);
  const procs = topRows(a.procedures.prescribed, 12);
  return (
    <View style={styles.stack}>
      <View style={styles.tiles}>
        <StatTile label={t('sanatorium.s2.avgOccupancy')} value={`${Math.round(a.occupancy.average_percent)}%`} sub={`${t('sanatorium.s2.peak')}: ${Math.round(a.occupancy.peak_percent)}%`} icon="building" tint="cyan" progress={a.occupancy.average_percent / 100} style={styles.tile} testID="an-occupancy" />
        <StatTile label={t('sanatorium.s2.arrivals')} value={a.arrivals.total} icon="arrowDown" tint="drop" style={styles.tile} testID="an-arrivals" />
        <StatTile label={t('sanatorium.s2.departures')} value={a.departures.total} icon="arrowUp" tint="amber" style={styles.tile} testID="an-departures" />
        <StatTile label={t('sanatorium.s2.avgStay')} value={a.average_length_of_stay != null ? a.average_length_of_stay.toFixed(1) : '—'} sub={t('sanatorium.s2.nights')} icon="clock" tint="violet" style={styles.tile} />
        <StatTile label={t('sanatorium.s2.revenue')} value={fmtMoney(revenueTotal)} sub={t('sanCatalog.an.revenueHint')} icon="wallet" tint="green" labelLines={2} style={styles.tile} testID="an-revenue-tile" />
      </View>
      <Card title={t('sanatorium.s2.occupancyChart')} icon="chart" tint="cyan" testID="an-occupancy-chart">
        <ColumnChart title={t('sanatorium.s2.occupancyChart')} values={occ.values} labels={occ.labels} max={100} unit="%" testID="an-occ-columns" />
      </Card>
      <Card title={t('sanCatalog.an.flow')} icon="chart" tint="drop" testID="an-flow-chart">
        <GroupedColumns
          title={t('sanCatalog.an.flow')}
          labels={flow.arrivals.labels}
          series={[
            { key: 'arr', label: t('sanatorium.s2.arrivals'), color: c.success, values: flow.arrivals.values },
            { key: 'dep', label: t('sanatorium.s2.departures'), color: c.info, values: flow.departures.values },
          ]}
          testID="an-flow"
        />
      </Card>
      <Card title={t('sanatorium.s2.revenue')} icon="wallet" tint="green" testID="an-revenue">
        <ListRow title={t('sanatorium.s2.accommodationTotal')} right={<Text variant="body">{fmtMoney(a.revenue.accommodation)}</Text>} />
        <ListRow title={t('sanatorium.paidAmount')} right={<Text variant="body">{fmtMoney(a.revenue.accommodation_paid)}</Text>} />
        <ListRow title={t('sanatorium.debt')} right={<Text variant="body" tone="danger">{fmtMoney(a.revenue.accommodation_debt)}</Text>} />
        {a.revenue.services != null && <ListRow title={t('sanatorium.s2.servicesTotal')} right={<Text variant="body">{fmtMoney(a.revenue.services)}</Text>} />}
        <ListRow title={t('sanatorium.total')} right={<Text variant="heading">{fmtMoney(revenueTotal)}</Text>} />
        <Text variant="caption" tone="subtle">{t('sanCatalog.an.revenueHint')}</Text>
      </Card>
      <Card title={t('sanatorium.s2.requests')} icon="inbox" tint="pink" testID="an-requests">
        <Text variant="caption" tone="muted">{a.requests.total} · {t('sanatorium.s2.accepted')}: {a.requests.accepted} · {t('sanatorium.s2.conversion')}: {Math.round(a.requests.conversion_percent)}%</Text>
        <OverlayRows
          title={t('sanatorium.s2.requests')}
          totalColor={c.chart1}
          partColor={c.success}
          legend={{ total: t('sanatorium.s2.requests'), part: t('sanatorium.s2.accepted') }}
          rows={a.requests.by_source.map((s) => ({ key: s.source, label: t(`sanatorium.source.${s.source}`, { defaultValue: s.source }), total: s.total, part: s.accepted }))}
          testID="an-requests-chart"
        />
      </Card>
      <Card title={t('sanatorium.s2.earlyLeaves')} icon="logout" tint="amber">
        <Text variant="caption" tone="muted">{a.early_leave.count} · {Math.round(a.early_leave.rate_percent)}%</Text>
        {a.early_leave.reasons.map((r, i) => <HBar key={i} label={r.reason} value={r.count} max={maxRes} tone="warn" />)}
      </Card>
      {a.doctors.length > 0 && (
        <Card title={t('sanatorium.s2.doctors')} icon="user" tint="violet" testID="an-doctors">
          <StackedRows
            title={t('sanatorium.s2.doctors')}
            colors={[c.success, c.info, c.danger, c.fgSubtle]}
            names={[t('sanatorium.s2.done'), t('sanCatalog.an.scheduled'), t('sanatorium.s2.missed'), t('sanCatalog.an.cancelled')]}
            rows={a.doctors.map((d) => ({ key: String(d.staff_id), label: d.name, sub: [d.specialty, `${t('sanCatalog.an.guests')}: ${d.guests}`].filter(Boolean).join(' · '), parts: [d.done, d.scheduled, d.missed, d.cancelled] }))}
            testID="an-doctors-chart"
          />
        </Card>
      )}
      {(procs.length > 0 || rooms.length > 0) && (
        <Card title={t('sanatorium.procedures')} icon="checklist" tint="drop" testID="an-procedures">
          {procs.length > 0 && (
            <OverlayRows
              title={t('sanatorium.procedures')}
              totalColor={c.chart1}
              partColor={c.success}
              legend={{ total: t('sanCatalog.an.sessionsTotal'), part: t('sanCatalog.an.sessionsDone') }}
              rows={procs.map((p, i) => ({ key: `${i}`, label: p.name, total: p.sessions_total, part: p.sessions_done }))}
              testID="an-procedures-chart"
            />
          )}
          {rooms.length > 0 && (
            <View testID="an-proc-rooms">
              <Text variant="label" tone="muted">{t('sanCatalog.an.roomsUtilization')}</Text>
              {rooms.map((r, i) => <HBar key={i} label={r.name} value={r.percent} max={100} right={`${r.done}/${r.planned}/${r.missed} · ${Math.round(r.percent)}%`} />)}
            </View>
          )}
        </Card>
      )}
      {a.feedback && (
        <Card title={t('sanatorium.s2.feedback')} icon="news" tint="pink" testID="an-feedback">
          <Text variant="body">{a.feedback.count} · {a.feedback.average_overall != null ? a.feedback.average_overall.toFixed(1) : '—'}/5</Text>
          <RatingDistribution dist={a.feedback.distribution} total={a.feedback.count} />
        </Card>
      )}
      {a.waitlist && (
        <Card title={t('sanatorium.s2.waitlist')} icon="clock" tint="amber">
          <Text variant="body">{t('sanatorium.s2.waiting')}: {a.waitlist.waiting_now} · {t('sanatorium.s2.offered')}: {a.waitlist.offered_now} · {t('sanatorium.s2.joined')}: {a.waitlist.joined} · {t('sanatorium.s2.converted')}: {a.waitlist.converted}</Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '47%', flexGrow: 1 },
});
