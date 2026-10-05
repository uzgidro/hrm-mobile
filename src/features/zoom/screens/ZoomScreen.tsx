// v3 Zoom yig'ilishlari — web v2 `ZoomPage` porti: kompaniyaning yagona litsenziyasi
// bo'yicha UMUMIY jadval (bo'sh vaqtni boshqalar band qilganini ko'rmasdan tanlab bo'lmaydi).
// Huquqlar serverdan: `config` (enabled / can_request / auto_approve) va har qatorning
// `can_manage` / `can_approve` bayroqlari. Faol tab va jonli chip 15 s da yangilanadi.
// Yig'ilish ichida yozuvni boshqarish, tayyor yozuvni ochish va arxivni tozalash — web'da.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { weekdayName } from '@/i18n/dates';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Fab,
  PageHeader,
  Pager,
  Screen,
  SearchField,
  Segmented,
  Skeleton,
  Text,
} from '@/ui';
import { ZOOM_PAGE_SIZE, zoomConfigQuery, zoomLiveQuery, zoomMeetingsQuery } from '../api/queries';
import { InvitationSheet } from '../components/InvitationSheet';
import { MeetingRow } from '../components/MeetingRow';
import { ZoomCreateSheet } from '../components/ZoomCreateSheet';
import { ZoomDetailSheet } from '../components/ZoomDetailSheet';
import {
  dayLabelKey,
  liveTone,
  statusesForScope,
  tashkentToday,
  tashkentWall,
  type ZoomMeeting,
  type ZoomScope,
} from '../utils/zoom';

export default function ZoomScreen() {
  const { t } = useTranslation();
  const [scope, setScope] = useState<ZoomScope>('active');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<{ meeting: ZoomMeeting; n: number } | null>(null);
  const [creating, setCreating] = useState<number | null>(null);
  const [created, setCreated] = useState<ZoomMeeting | null>(null);

  const config = useQuery(zoomConfigQuery());
  const cfg = config.data;
  const enabled = !!cfg?.enabled;
  const list = useQuery({ ...zoomMeetingsQuery({ scope, status, search: debounced, page }), enabled });
  const live = useQuery(zoomLiveQuery(enabled && !!cfg?.can_request));
  const rows = list.data?.items ?? [];
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / ZOOM_PAGE_SIZE));
  const today = tashkentToday();

  // Tortib yangilash — o'z bayrog'i bilan: 15 s lik fon yangilanishi spinner chiqarmasin.
  const [pulling, setPulling] = useState(false);
  const pull = async () => {
    setPulling(true);
    try {
      // Jonli so'rov o'chiq bo'lsa (can_request yo'q) qo'lda ham so'ralmaydi — server 403 beradi.
      await Promise.all([list.refetch(), cfg?.can_request ? live.refetch() : null]);
    } finally {
      setPulling(false);
    }
  };
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };
  // Ochiq varaq ro'yxatdagi YANGI nusxani ko'rsatadi (jonli nuqta, holat yangilanadi).
  const shown = viewing ? (rows.find((r) => r.id === viewing.meeting.id) ?? viewing.meeting) : null;

  const header = <PageHeader title={t('zoom.title')} subtitle={t('zoom.subtitle')} />;

  if (config.isPending) {
    return (
      <Screen>
        {header}
        <Skeleton height={220} />
      </Screen>
    );
  }
  if (config.isError && !config.data) {
    return (
      <Screen>
        {header}
        <ErrorState onRetry={() => config.refetch()} />
      </Screen>
    );
  }
  if (!enabled) {
    return (
      <Screen>
        {header}
        <Card>
          <EmptyState title={t('zoom.disabled')} message={t('zoom.disabledHint')} />
        </Card>
      </Screen>
    );
  }

  const renderRows = () => {
    let prevDay: string | null = null;
    return rows.map((m) => {
      const wall = tashkentWall(m.start_at);
      const day = wall ? wall.slice(0, 10) : '';
      const head = day !== prevDay;
      prevDay = day;
      const key = dayLabelKey(day, today);
      const label = !day ? '—' : key ? t(`zoom.${key}`) : dayjs(day).format('DD.MM.YYYY');
      return (
        <View key={m.id}>
          {head && (
            <Text variant="label" tone="muted" style={styles.dayHead} testID={`zoom-day-${day || 'none'}`}>
              {day ? `${label} · ${weekdayName(dayjs(day).day())}` : label}
            </Text>
          )}
          <MeetingRow m={m} onPress={() => setViewing({ meeting: m, n: Date.now() })} />
        </View>
      );
    });
  };

  const liveData = live.data;
  const filtered = !!status || !!debounced.trim();

  return (
    <View style={styles.root}>
      <Screen refreshing={pulling} onRefresh={() => void pull()}>
        {header}
        {(!!liveData?.max_concurrent || cfg.max_concurrent > 0) && (
          <View style={styles.liveRow}>
            {!!liveData?.max_concurrent && (
              <Badge
                testID="zoom-live-chip"
                label={`${t('zoom.liveNow', { count: liveData.live_count, limit: liveData.max_concurrent })}${
                  liveData.is_full ? ` · ${t('zoom.liveFull')}` : ''
                }`}
                tone={liveTone(liveData)}
              />
            )}
            {cfg.max_concurrent > 0 && (
              <Text variant="caption" tone="subtle">
                {t('zoom.concurrentHint', { count: cfg.max_concurrent })}
              </Text>
            )}
          </View>
        )}
        <View style={styles.filters}>
          <Segmented<ZoomScope>
            testID="zoom-scope"
            options={[
              { value: 'active', label: t('zoom.scopeActive') },
              { value: 'archive', label: t('zoom.scopeArchive') },
            ]}
            value={scope}
            onChange={(v) =>
              reset(() => {
                setScope(v);
                // Faol tabda faqat pending/approved filtri ma'noli.
                if (!statusesForScope(v).includes(status)) setStatus('');
              })
            }
          />
          <SearchField
            value={search}
            onChangeText={(v) => reset(() => setSearch(v))}
            placeholder={t('zoom.searchPlaceholder')}
          />
          <View style={styles.chips}>
            <Chip label={t('zoom.statusAll')} selected={!status} onPress={() => reset(() => setStatus(''))} />
            {statusesForScope(scope).map((s) => (
              <Chip
                key={s}
                testID={`zoom-filter-${s}`}
                label={t(`zoom.status_${s}`)}
                selected={status === s}
                onPress={() => reset(() => setStatus(status === s ? '' : s))}
              />
            ))}
          </View>
        </View>
        <Card>
          {list.isError && !list.data ? (
            <ErrorState onRetry={() => list.refetch()} />
          ) : list.isPending ? (
            <Skeleton height={220} />
          ) : rows.length === 0 ? (
            filtered ? (
              <EmptyState title={t('common.noMatch')} message={t('common.noMatchHint')} />
            ) : (
              <EmptyState title={t('zoom.empty')} message={cfg.can_request ? t('zoom.emptyHint') : undefined} />
            )
          ) : (
            renderRows()
          )}
          <Pager page={page} pages={pages} onPage={setPage} />
        </Card>
        <Text variant="caption" tone="subtle" style={styles.note}>
          {t('zoom.webOnly')}
        </Text>
        {cfg.can_request && <View style={styles.fabSpace} />}
      </Screen>
      {cfg.can_request && (
        <Fab
          testID="zoom-add"
          accessibilityLabel={cfg.auto_approve ? t('zoom.openMeeting') : t('zoom.request')}
          onPress={() => setCreating(Date.now())}
        />
      )}
      {shown && viewing && <ZoomDetailSheet key={viewing.n} meeting={shown} onClose={() => setViewing(null)} />}
      {cfg.can_request && creating !== null && (
        <ZoomCreateSheet
          key={creating}
          autoApprove={!!cfg.auto_approve}
          onClose={() => setCreating(null)}
          onCreated={setCreated}
        />
      )}
      {created && <InvitationSheet key={created.id} meeting={created} onClose={() => setCreated(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  liveRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 },
  filters: { gap: 10, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayHead: { paddingTop: 10, paddingBottom: 4 },
  note: { marginTop: 12 },
  fabSpace: { height: 72 },
});
