// v3 KPP posti — web v2 `pages/KppPage.tsx` porti. Mehmonlar (qidiruv + tashrif
// filtri, oxirgi tashrif kuni bo'yicha guruhlangan) va bugungi turniket
// o'tishlari. Mehmonni bosish o'tishlarni unga filtrlaydi, qayta bosish bekor
// qiladi (v2). Real vaqt: v2 soketi o'rniga 120 s polling. Planshetda ikki ustun.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { moduleTint, radii } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { useBreakpoint } from '@/utils/responsive';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  Avatar,
  Badge,
  Bento,
  Card,
  EmptyState,
  IconButton,
  ListRow,
  Screen,
  SearchField,
  Segmented,
  Skeleton,
  Text,
} from '@/ui';
import { kppVisitorsQuery, visitorEventsQuery, type VisitFilter } from '../api/queries';
import { countPasses, groupVisitorsByDay, NO_VISIT } from '../utils/kpp';

/** Bugungi sana — daqiqada bir yangilanadi (yarim tundan keyin «bugun» almashadi). */
function useToday(): string {
  const { data } = useQuery({
    queryKey: ['kpp', 'today'],
    queryFn: () => dayjs().format('YYYY-MM-DD'),
    initialData: () => dayjs().format('YYYY-MM-DD'),
    refetchInterval: 60_000,
    staleTime: 0,
  });
  return data;
}

/** `showBack` — stack'dan (Modullar → KPP) ochilganda; Post tabida kerak emas. */
export default function KppScreen({ showBack = false }: { showBack?: boolean } = {}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { sizeClass } = useBreakpoint();
  const user = useAuthStore((s) => s.user);
  const branchId = resolveEmployeeBranchId(user?.employee) ?? user?.organization_branch_id ?? undefined;
  const today = useToday();

  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [visit, setVisit] = useState<VisitFilter>('all');
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);

  const visitorsQ = useQuery(kppVisitorsQuery({ search: debounced, visit, branchId }));
  const eventsQ = useQuery(visitorEventsQuery(today, selected?.id ?? null));
  const events = eventsQ.data ?? [];
  const groups = useMemo(() => groupVisitorsByDay(visitorsQ.data ?? []), [visitorsQ.data]);
  const passes = countPasses(events);

  const dayLabel = (key: string) => {
    if (key === NO_VISIT) return t('kpp.noVisit');
    if (key === today) return t('kpp.today');
    if (key === dayjs(today).subtract(1, 'day').format('YYYY-MM-DD')) return t('kpp.yesterday');
    return dayjs(key).format('DD.MM.YYYY');
  };

  const green = moduleTint(c, 'green');
  const amber = moduleTint(c, 'amber');

  const guests = (
    <Card title={t('kpp.guests')} icon="guest" tint="amber">
      <SearchField value={search} onChangeText={setSearch} placeholder={t('kpp.searchGuest')} />
      <View style={styles.filter}>
        <Segmented<VisitFilter>
          options={[
            { value: 'all', label: t('kpp.all') },
            { value: 'today', label: t('kpp.today') },
            { value: 'yesterday', label: t('kpp.yesterday') },
            { value: 'never', label: t('kpp.noVisitShort') },
          ]}
          value={visit}
          onChange={setVisit}
        />
      </View>
      {visitorsQ.isPending ? (
        <Skeleton height={160} />
      ) : groups.length === 0 ? (
        <EmptyState title={t('kpp.noGuests')} />
      ) : (
        groups.map((g) => (
          <View key={g.key}>
            <Text variant="caption" tone="subtle" style={styles.groupTitle}>
              {dayLabel(g.key)}
            </Text>
            {g.items.map((v) => {
              const active = selected?.id === v.id;
              const sub = [v.organization_name || t('kpp.noOrganization'), v.host_employee_name && `${t('kpp.host')}: ${v.host_employee_name}`]
                .filter(Boolean)
                .join(' · ');
              return (
                <View key={v.id} style={[styles.guest, active && { backgroundColor: c.brandSoft }]}>
                  <ListRow
                    testID={`kpp-guest-${v.id}`}
                    title={v.legal_name ?? '—'}
                    subtitle={sub}
                    left={<Avatar name={v.legal_name ?? '?'} uri={v.photo_path} size={36} />}
                    right={
                      v.last_visit_time ? (
                        <View style={styles.right}>
                          <Text variant="label" tone="brand" style={styles.time}>
                            {dayjs(v.last_visit_time).format('HH:mm')}
                          </Text>
                          {(v.visit_count ?? 0) > 0 && (
                            <Text variant="caption" tone="subtle">
                              {t('kpp.visits', { count: v.visit_count ?? 0 })}
                            </Text>
                          )}
                        </View>
                      ) : undefined
                    }
                    onPress={() => setSelected(active ? null : { id: v.id, name: v.legal_name ?? '' })}
                  />
                </View>
              );
            })}
          </View>
        ))
      )}
    </Card>
  );

  const passesCard = (
    <Card
      title={t('kpp.todayPasses')}
      icon="clock"
      tint="green"
      action={selected ? { label: t('kpp.clearSelection'), onPress: () => setSelected(null) } : undefined}
    >
      {selected && (
        <View style={styles.selectedRow}>
          <Badge label={selected.name} tone="brand" />
        </View>
      )}
      {eventsQ.isPending ? (
        <Skeleton height={120} />
      ) : events.length === 0 ? (
        <EmptyState title={t('kpp.noPasses')} message={t('kpp.noPassesHint')} />
      ) : (
        events.map((e, i) => {
          const entrance = e.direction_type === 'entrance';
          const name = e.visitor?.legal_name ?? '—';
          return (
            <ListRow
              key={String(e.event_id ?? e.id ?? i)}
              title={name}
              subtitle={e.turnstile?.display_name || e.turnstile?.acs_dev_name || undefined}
              left={<Avatar name={name} uri={e.visitor?.photo_path} size={32} />}
              right={
                <View style={styles.right}>
                  <Text variant="label" style={styles.time}>
                    {e.happen_time ? dayjs(e.happen_time).format('HH:mm:ss') : '—'}
                  </Text>
                  <Badge label={entrance ? t('kpp.entered') : t('kpp.exited')} tone={entrance ? 'success' : 'warning'} />
                </View>
              }
            />
          );
        })
      )}
    </Card>
  );

  return (
    <Screen refreshing={visitorsQ.isRefetching} onRefresh={() => void Promise.all([visitorsQ.refetch(), eventsQ.refetch()])}>
      <View style={styles.header}>
        {showBack && <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />}
        <Text variant="title" accessibilityRole="header" style={styles.flex}>
          {t('kpp.title')}
        </Text>
        <View style={[styles.counter, { backgroundColor: green.wash }]} testID="kpp-entered">
          <Text variant="caption" tone="muted">
            {t('kpp.entered')}
          </Text>
          <Text variant="heading">{String(passes.entered)}</Text>
        </View>
        <View style={[styles.counter, { backgroundColor: amber.wash }]} testID="kpp-exited">
          <Text variant="caption" tone="muted">
            {t('kpp.exited')}
          </Text>
          <Text variant="heading">{String(passes.exited)}</Text>
        </View>
      </View>
      <Bento columns={sizeClass === 'compact' ? 1 : 2}>
        <Bento.Item>{guests}</Bento.Item>
        <Bento.Item>{passesCard}</Bento.Item>
      </Bento>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 12 },
  flex: { flex: 1 },
  counter: { borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', minWidth: 64 },
  filter: { marginTop: 10, marginBottom: 6 },
  groupTitle: { textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 2 },
  guest: { borderRadius: radii.md, paddingHorizontal: 4 },
  right: { alignItems: 'flex-end', gap: 4 },
  time: { fontVariant: ['tabular-nums'] },
  selectedRow: { marginBottom: 6 },
});
