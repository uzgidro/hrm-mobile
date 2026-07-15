import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon, type IconName } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LoadingView, EmptyState, ErrorState } from '@/components/StateViews';
import { monthName } from '@/i18n/dates';
import type { KpiEntry } from '@/types';
import { myScorecardQuery } from '../api/queries';
import { KpiGauge } from '../components/KpiGauge';
import {
  entryStatusKey, isPenaltyEntry, scorecardTotals, entryResultDisplay, resultColorKey,
} from '../utils';

// «Мой KPI» — the employee's personal Verifix scorecard (web EmployeeKpiScreen):
// profile card + gauge + period chips + the entries list with a totals footer.
// The gauge percent arrives computed from the backend — never recomputed here.

const fmtDate = (d?: string | null) => (d ? dayjs(d).format('DD.MM.YYYY') : '—');

// 'YYYY-MM' → localized "Iyul 2026".
function periodLabel(p: string): string {
  const [y, m] = p.split('-');
  const name = monthName(Number(m) - 1);
  return name ? `${name} ${y}` : p;
}

export default function MyKpiScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Selected period ('YYYY-MM'); '' = the current month.
  const [period, setPeriod] = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery(myScorecardQuery(period));

  const profile = data?.profile;
  const entries = data?.entries ?? [];
  const periods = data?.available_periods ?? [];
  const activePeriod = period || data?.period || '';
  const totals = scorecardTotals(entries);

  const statusStyle = (key: ReturnType<typeof entryStatusKey>) =>
    key === 'final'
      ? { backgroundColor: colors.successSoft, color: colors.success }
      : key === 'inProgress'
        ? { backgroundColor: colors.warningSoft, color: colors.warning }
        : { backgroundColor: colors.skeleton, color: colors.textSecondary };

  const resultStyle = (e: KpiEntry) => {
    if (isPenaltyEntry(e)) {
      return { color: Number(e.fact_value) > 0 ? colors.error : colors.textMuted };
    }
    const key = resultColorKey(e.result_percent);
    return {
      color:
        key === 'good' ? colors.success
        : key === 'mid' ? colors.warning
        : key === 'bad' ? colors.error
        : colors.textMuted,
    };
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('kpi.title')} />

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState title={t('kpi.loadError')} onRetry={() => refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          {/* ── Profile + gauge card ── */}
          <View style={styles.card}>
            <View style={styles.profileRow}>
              {profile?.photo_path ? (
                <Image source={{ uri: profile.photo_path }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>
                    {(profile?.legal_name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>{profile?.legal_name || '—'}</Text>
                {!!(profile?.job_position_name || profile?.department_name) && (
                  <Text style={styles.sub} numberOfLines={2}>
                    {[profile?.job_position_name, profile?.department_name].filter(Boolean).join(', ')}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.infoGrid}>
              <InfoRow icon="building" label={t('kpi.department')} value={profile?.department_name} styles={styles} colors={colors} />
              <InfoRow
                icon="calendar"
                label={t('kpi.period')}
                value={profile?.period_begin ? `${fmtDate(profile.period_begin)} — ${fmtDate(profile.period_end)}` : undefined}
                styles={styles}
                colors={colors}
              />
              <InfoRow icon="users" label={t('kpi.supervisor')} value={profile?.supervisor_name} styles={styles} colors={colors} />
              <InfoRow icon="clock" label={t('kpi.schedule')} value={profile?.work_schedule} styles={styles} colors={colors} />
            </View>

            <View style={styles.gaugeWrap}>
              <KpiGauge value={data?.result_percent != null ? Number(data.result_percent) : null} size={230} />
            </View>

            {periods.length > 0 && (
              <View style={styles.periodBlock}>
                <Text style={styles.periodTitle}>{t('kpi.periodPicker')}</Text>
                <View style={styles.chips}>
                  {periods.map((p) => {
                    const active = activePeriod === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setPeriod(p)}
                        style={[styles.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, active && { color: colors.onPrimary }]}>{periodLabel(p)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* ── Entries ── */}
          <Text style={styles.sectionLabel}>{t('kpi.entriesTitle')}</Text>

          {entries.length === 0 ? (
            <EmptyState icon="target" title={t('kpi.emptyPeriod')} />
          ) : (
            <>
              {entries.map((e) => {
                const penalty = isPenaltyEntry(e);
                const st = entryStatusKey(e.status);
                const stStyle = statusStyle(st);
                return (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.entryCard, penalty && styles.entryPenalty]}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/kpi-entry', params: { id: String(e.id) } })}
                  >
                    <View style={styles.entryTop}>
                      {penalty && (
                        <View style={styles.penaltyBadge}>
                          <Text style={styles.penaltyBadgeText}>{t('kpi.penalty')} −</Text>
                        </View>
                      )}
                      <Text style={styles.entryName}>{e.indicator?.name || '—'}</Text>
                    </View>
                    <Text style={styles.entryDates}>
                      {fmtDate(e.period_start)} — {fmtDate(e.period_end)}
                    </Text>
                    <View style={styles.entryBottom}>
                      <Metric label={t('kpi.plan')} value={String(Number(e.plan_value ?? 0))} styles={styles} />
                      <Metric
                        label={t('kpi.fact')}
                        value={penalty && Number(e.fact_value) > 0 ? `−${Number(e.fact_value)}` : String(Number(e.fact_value ?? 0))}
                        color={penalty && Number(e.fact_value) > 0 ? colors.error : undefined}
                        styles={styles}
                      />
                      <Metric
                        label={t('kpi.result')}
                        value={entryResultDisplay(e)}
                        color={resultStyle(e).color}
                        styles={styles}
                      />
                      <View style={[styles.statusPill, { backgroundColor: stStyle.backgroundColor }]}>
                        <Text style={[styles.statusPillText, { color: stStyle.color }]}>
                          {t(`kpi.status${st.charAt(0).toUpperCase()}${st.slice(1)}`)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* ── Totals footer (web tfoot parity) ── */}
              <View style={styles.totalsCard}>
                <TotalRow label={t('kpi.planSum')} value={String(totals.plan)} styles={styles} />
                <TotalRow label={t('kpi.factSum')} value={String(totals.addFact)} styles={styles} />
                {totals.subFact > 0 && (
                  <>
                    <TotalRow label={t('kpi.penaltySum')} value={`−${totals.subFact}`} color={colors.error} styles={styles} />
                    <TotalRow label={t('kpi.totalNet')} value={String(totals.net)} bold styles={styles} />
                  </>
                )}
              </View>
            </>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Small presentational bits ────────────────────────────────────────────────
type Styles = ReturnType<typeof makeStyles>;

function InfoRow({
  icon, label, value, styles, colors,
}: { icon: IconName; label: string; value?: string | null; styles: Styles; colors: ThemeColors }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon name={icon} size={14} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function Metric({ label, value, color, styles }: { label: string; value: string; color?: string; styles: Styles }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function TotalRow({
  label, value, color, bold, styles,
}: { label: string; value: string; color?: string; bold?: boolean; styles: Styles }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, color ? { color } : null, bold && styles.totalBold]}>{label}</Text>
      <Text style={[styles.totalValue, color ? { color } : null, bold && styles.totalBold]}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingTop: 8 },

    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder,
      padding: 16, marginBottom: 18,
    },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.skeleton },
    avatarFallback: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 22, fontWeight: '800', color: c.primary },
    name: { fontSize: 16, fontWeight: '800', color: c.text },
    sub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    infoGrid: {
      marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.cardBorder, gap: 10,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoIcon: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    infoLabel: { fontSize: 10.5, color: c.textMuted },
    infoValue: { fontSize: 13, color: c.text, marginTop: 1 },

    gaugeWrap: { alignItems: 'center', marginTop: 16 },

    periodBlock: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.cardBorder },
    periodTitle: {
      fontSize: 11, fontWeight: '700', color: c.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      height: 30, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center',
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder,
    },
    chipText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },

    sectionLabel: {
      fontSize: 12, fontWeight: '700', color: c.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginLeft: 2,
    },

    entryCard: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
      padding: 14, marginBottom: 10,
    },
    entryPenalty: { borderColor: c.errorSoft, backgroundColor: c.errorSoft },
    entryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
    penaltyBadge: {
      backgroundColor: c.errorSoft, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
      borderWidth: 1, borderColor: c.error,
    },
    penaltyBadgeText: { fontSize: 9.5, fontWeight: '800', color: c.error },
    entryName: { flex: 1, fontSize: 14, fontWeight: '700', color: c.text, lineHeight: 19 },
    entryDates: { fontSize: 11.5, color: c.textMuted, marginTop: 4 },
    entryBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 10 },
    metric: { minWidth: 44 },
    metricLabel: { fontSize: 10, color: c.textMuted, textTransform: 'uppercase' },
    metricValue: { fontSize: 14, fontWeight: '700', color: c.text, marginTop: 2 },
    statusPill: {
      marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
    },
    statusPillText: { fontSize: 11, fontWeight: '700' },

    totalsCard: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
      paddingHorizontal: 14, paddingVertical: 8, marginTop: 4,
    },
    totalRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6,
    },
    totalLabel: { fontSize: 13, color: c.textSecondary },
    totalValue: { fontSize: 14, fontWeight: '700', color: c.text },
    totalBold: { fontWeight: '800', color: c.text, fontSize: 15 },
  });
