// Kitchen tabs (web SanKitchenPage): today's eating list with search / diet / allergies, the headcount
// table with a start date and 7 / 14 / 30 day range, and the arrivals / departures strip with food info.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Card, Chip, EmptyState, ListRow, SearchField, SectionHeader, Text } from '@/ui';
import { dayStaysQuery } from '../api/staffQueries';
import { countsQuery, kitchenDayQuery } from '../api/queries';
import { dietsQuery, type Diet } from '../api/sections2';
import type { Stay } from '../types';
import { useSanFeatures } from '../utils/features';
import { fmtDate, todayIso } from '../utils/sanatorium';
import { pickText } from '../utils/sections2';
import { filterByGuestName, foodLine, KITCHEN_RANGES } from '../utils/staffParity';
import { DayBar, QueryBlock } from './common';
import { DateField } from './forms';

/** Diet catalog of the kitchen / registrar (only while the diet section is on); id -> localized name. */
export function useDietNames(enabled: boolean): (id: number | null | undefined, code?: string | null) => string | null {
  const { i18n } = useTranslation();
  const q = useQuery(dietsQuery(true, enabled));
  return (id, code) => {
    const d: Diet | undefined = id != null ? q.data?.find((x) => x.id === id) : undefined;
    return d ? pickText(d as unknown as Record<string, unknown>, 'name', i18n.language) || d.code : (code ?? null);
  };
}

// ── Today ──
export function KitchenToday({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const [day, setDay] = useState(todayIso());
  const [search, setSearch] = useState('');
  const { on } = useSanFeatures();
  const dietOn = on('diet');
  const q = useQuery(kitchenDayQuery(day, enabled));
  const dietName = useDietNames(enabled && dietOn);
  return (
    <View style={styles.stack} testID="kitchen-today">
      <DayBar value={day} onChange={setDay} />
      <SearchField testID="kitchen-search" value={search} onChangeText={setSearch} placeholder={t('sanStaff.kitchen.search')} />
      <QueryBlock query={q}>
        {(items) => {
          const rows = filterByGuestName(items, search);
          return (
            <>
              <Text variant="label" tone="muted" testID="kitchen-eating-count">{t('sanStaff.kitchen.eatingCount', { n: rows.length })}</Text>
              {rows.length === 0 ? (
                <EmptyState title={t('sanatorium.noEating')} />
              ) : (
                <Card>
                  {rows.map((p) => {
                    const diet = [dietName(p.diet_id, p.diet_code), p.diet_note].filter(Boolean).join(', ');
                    return (
                      <ListRow
                        key={p.stay_id}
                        testID={`eat-${p.stay_id}`}
                        title={p.guest.full_name}
                        subtitle={p.room ? `${t('sanatorium.room')} ${p.room}` : undefined}
                        below={
                          !!diet || !!p.allergies || p.is_child ? (
                            <View style={styles.badges}>
                              {p.is_child && <Badge testID={`eat-child-${p.stay_id}`} label={t('sanatorium.child')} tone="info" />}
                              {!!diet && <Badge testID={`eat-diet-${p.stay_id}`} label={diet} tone="warning" />}
                              {!!p.allergies && <Badge testID={`eat-allergy-${p.stay_id}`} label={`${t('sanStaff.my.allergy')}: ${p.allergies}`} tone="danger" />}
                            </View>
                          ) : undefined
                        }
                      />
                    );
                  })}
                </Card>
              )}
            </>
          );
        }}
      </QueryBlock>
    </View>
  );
}

// ── Counts ──
export function KitchenCounts({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const [start, setStart] = useState(todayIso());
  const [days, setDays] = useState<number>(7);
  const q = useQuery(countsQuery(start, days, enabled));
  return (
    <View style={styles.stack} testID="kitchen-counts">
      <DateField label={t('sanStaff.kitchen.from')} value={start} onChange={setStart} testID="counts-start" />
      <View style={styles.chips}>
        {KITCHEN_RANGES.map((n) => (
          <Chip key={n} testID={`counts-range-${n}`} label={t('sanStaff.kitchen.nDays', { n })} selected={days === n} onPress={() => setDays(n)} />
        ))}
      </View>
      <QueryBlock query={q}>
        {(c) => (
          <View style={styles.stack}>
            {c.days.length === 0 && <EmptyState title={t('sanStaff.kitchen.noCounts')} />}
            {c.days.map((d) => (
              <Card key={d.date} testID={`count-${d.date}`}>
                <View style={styles.row}>
                  <Text variant="heading" style={styles.flex}>{`${fmtDate(d.date)}${d.date === todayIso() ? ` · ${t('sanatorium.today')}` : ''}`}</Text>
                  <Text variant="number" testID={`count-total-${d.date}`}>{d.total}</Text>
                </View>
                <Text variant="caption" tone="muted">
                  {[
                    `${t('sanatorium.adults')}: ${d.adults}`,
                    `${t('sanatorium.children')}: ${d.children}`,
                    `${t('sanatorium.diet')}: ${d.diet}`,
                    `${t('sanatorium.arrivals')}: ${d.arrivals}`,
                    ...(d.departures !== undefined ? [`${t('sanatorium.departures')}: ${d.departures}`] : []),
                  ].join(' · ')}
                </Text>
              </Card>
            ))}
            <Card title={t('sanatorium.earlyLeaves')} icon="logout" tint="amber" testID="kitchen-early">
              {(c.early_leaves ?? []).length === 0 && <Text variant="body" tone="muted">{t('sanStaff.kitchen.noEarly')}</Text>}
              {(c.early_leaves ?? []).map((e, i) => (
                <ListRow key={i} title={e.guest.full_name} subtitle={t('sanStaff.kitchen.leavesOn', { date: fmtDate(e.date), planned: fmtDate(e.planned_to) })} />
              ))}
            </Card>
          </View>
        )}
      </QueryBlock>
    </View>
  );
}

// ── Arrivals / departures strip ──
function FlowCard({ title, empty, rows, food, testID }: { title: string; empty: string; rows: Stay[]; food: (s: Stay) => string; testID: string }) {
  const { t } = useTranslation();
  return (
    <View testID={testID}>
      <SectionHeader title={`${title} (${rows.length})`} />
      <Card>
        {rows.length === 0 && <Text variant="body" tone="muted">{empty}</Text>}
        {rows.map((s) => (
          <ListRow
            key={s.id}
            testID={`${testID}-${s.id}`}
            title={s.guest?.full_name ?? '—'}
            subtitle={[s.room ? `${t('sanatorium.room')} ${s.room.number}` : t('sanatorium.noRoom'), food(s)].filter(Boolean).join(' · ')}
            right={<Badge label={t(`sanatorium.stayStatus.${s.status}`)} tone={s.status === 'checked_in' ? 'success' : 'info'} />}
            chevron
            onPress={() => router.push({ pathname: '/sanatorium-stay', params: { id: String(s.id) } })}
          />
        ))}
      </Card>
    </View>
  );
}

/** Who comes and who leaves today with their food info. Renders nothing when the server refuses the lists. */
export function KitchenFlowStrip({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const day = todayIso();
  const inn = useQuery(dayStaysQuery('arrivals', day, enabled));
  const out = useQuery(dayStaysQuery('departures', day, enabled));
  const dietOn = useSanFeatures().on('diet');
  const dietName = useDietNames(enabled && dietOn);
  if (!enabled || inn.isError || out.isError || (!inn.data && !out.data)) return null;
  const food = (s: Stay) => foodLine(s, dietName(s.diet_id), t('sanStaff.kitchen.noMeals'));
  return (
    <View style={styles.stack} testID="kitchen-strip">
      <FlowCard testID="kitchen-arrivals" title={t('sanatorium.arrivalsToday')} empty={t('sanatorium.noArrivals')} rows={inn.data ?? []} food={food} />
      <FlowCard testID="kitchen-departures" title={t('sanatorium.departuresToday')} empty={t('sanatorium.noDepartures')} rows={out.data ?? []} food={food} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
});
