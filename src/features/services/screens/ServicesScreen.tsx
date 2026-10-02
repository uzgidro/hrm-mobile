// v3 Interaktiv xizmatlar — web v2 `ServicesPage` porti (TZ 4.2.12): uchta xizmat
// plitkasi (hisob-kitob kassasi) + o'z so'rovlarim / ko'rib chiqish navbati
// (faqat kadr va bosh admin). Mavjud bo'lmagan xizmat plitkasi SABABINI aytadi —
// jimgina yo'qolgan xizmat xato bo'lib ko'rinadi. Hujjat shakllantirish — web'da.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { canReviewServices } from '@/utils/roles';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ListRow,
  PageHeader,
  Pager,
  Screen,
  Segmented,
  Skeleton,
  Text,
} from '@/ui';
import { myServiceRequestsQuery, serviceCatalogQuery, serviceInboxQuery } from '../api/queries';
import { ServiceCreateSheet } from '../components/ServiceCreateSheet';
import { STATUS_TONE, ServiceDetailSheet } from '../components/ServiceDetailSheet';
import { STATUS_CHAIN, TRANSITIONS, type ServiceStatus } from '../utils/services';

type Tab = 'mine' | 'inbox';
const ALL_STATUSES = Object.keys(TRANSITIONS) as ServiceStatus[];
void STATUS_CHAIN;

export default function ServicesScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canReview = canReviewServices(user);
  const [tab, setTab] = useState<Tab>('mine');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);

  const catalog = useQuery(serviceCatalogQuery());
  const mine = useQuery(myServiceRequestsQuery({ status, page }));
  const inbox = useQuery(serviceInboxQuery({ status, page }, canReview && tab === 'inbox'));
  const list = tab === 'inbox' && canReview ? inbox : mine;
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
        <PageHeader title={t('services.title')} subtitle={t('services.subtitle')} />
        <View style={styles.tiles}>
          {(catalog.data ?? []).map((c) => (
            <View key={c.type} style={styles.tile}>
              <Card>
                <ListRow
                  testID={`service-tile-${c.type}`}
                  title={t(`services.type_${c.type}`, { defaultValue: c.label })}
                  subtitle={c.available ? t('services.tileAvailable') : (c.reason ?? t('services.tileClosed'))}
                  onPress={c.available ? () => setCreating(c.type) : undefined}
                />
              </Card>
            </View>
          ))}
        </View>
        {canReview && (
          <View style={styles.filters}>
            <Segmented<Tab>
              options={[
                { value: 'mine', label: t('services.tab_mine') },
                { value: 'inbox', label: t('services.tab_inbox') },
              ]}
              value={tab}
              onChange={(v) => reset(() => setTab(v))}
            />
          </View>
        )}
        <View style={[styles.filters, styles.chips]}>
          <Chip label={t('services.allStatuses')} selected={!status} onPress={() => reset(() => setStatus(''))} />
          {ALL_STATUSES.map((s) => (
            <Chip
              key={s}
              testID={`service-status-${s}`}
              label={t(`services.status_${s}`)}
              selected={status === s}
              onPress={() => reset(() => setStatus(status === s ? '' : s))}
            />
          ))}
        </View>
        <Card>
          {list.isError ? (
            <ErrorState onRetry={() => list.refetch()} />
          ) : list.isPending ? (
            <Skeleton height={200} />
          ) : (list.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              title={t(tab === 'inbox' && canReview ? 'services.inboxEmpty' : 'services.mineEmpty')}
              message={t(tab === 'inbox' && canReview ? 'services.inboxEmptyHint' : 'services.mineEmptyHint')}
            />
          ) : (
            list.data!.items.map((r) => (
              <ListRow
                key={r.id}
                title={r.number}
                subtitle={[
                  t(`services.type_${r.service_type}`, { defaultValue: r.service_type }),
                  tab === 'inbox' ? r.applicant_name : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                right={
                  <Badge
                    label={t(`services.status_${r.status}`, { defaultValue: r.status })}
                    tone={STATUS_TONE[r.status]}
                  />
                }
                onPress={() => setViewing(r.id)}
              />
            ))
          )}
          <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />
        </Card>
        <Text variant="caption" tone="subtle" style={styles.note}>
          {t('services.webOnly')}
        </Text>
      </Screen>
      {creating !== null && (
        <ServiceCreateSheet
          key={creating}
          catalog={catalog.data ?? []}
          initialType={creating}
          onClose={() => setCreating(null)}
        />
      )}
      {viewing !== null && (
        <ServiceDetailSheet
          key={viewing}
          id={viewing}
          canReview={canReview}
          myEmployeeId={user?.employee?.id}
          onClose={() => setViewing(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tiles: { gap: 8, marginBottom: 12 },
  tile: { width: '100%' },
  filters: { marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  note: { marginTop: 12 },
});
