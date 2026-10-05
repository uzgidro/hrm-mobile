// v3 Registratsiyalar — web v2 `RegistrationsPage` porti (TZ 4.2.2): ro'yxatdan o'tish arizalari
// navbati. Holat bo'yicha (standart — kutilayotganlar; «Barchasi» — holatsiz), server qidiruvi
// (F.I.O., login, JShShIR), server sahifalash; qator → ariza kartochkasi (tasdiqlash / rad etish).
// Huquq: katalog ADMIN_ONLY + SYSTEM_ADMIN_KEYS (admin hisobi, master-admin, AKT xodimi); server
// `require_system_admin` va filial doirasi — 403 bo'lsa «Ruxsat yo'q». Holat toni mehmonning
// «Arizam holati» ekrani bilan bitta manbadan (`@/utils/registrationStatus`).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { registrationStatusTone } from '@/utils/registrationStatus';
import { useBreakpoint } from '@/utils/responsive';
import { formatTashkentDate } from '@/utils/tashkentTime';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  PageHeader,
  Pager,
  Screen,
  SearchField,
  Segmented,
  Skeleton,
  Text,
} from '@/ui';
import { registrationsQuery } from '../api/queries';
import { RegistrationSheet } from '../components/RegistrationSheet';
import { REGISTRATION_FILTERS, claimText, type RegistrationFilter, type RegistrationRow } from '../utils/registrations';

export default function RegistrationsScreen() {
  const { t } = useTranslation();
  const compact = useBreakpoint().sizeClass === 'compact';
  const [status, setStatus] = useState<RegistrationFilter>('pending');
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<{ row: RegistrationRow; n: number } | null>(null);
  const list = useQuery(registrationsQuery(status, debounced, page));
  // Sahifa serverdagi sahifalar sonidan oshmasin: oxirgi sahifadagi yagona ariza ko'rib chiqilsa
  // ro'yxat bo'sh qolib, Pager yashirinib qolardi — oxirgi mavjud sahifaga qaytamiz (render paytidagi
  // tuzatish, vehicles RequestsTab kabi). Holat/qidiruv o'zgarsa sahifa 1 ga qaytariladi (pastda).
  const serverPages = list.isSuccess && !list.isPlaceholderData ? Math.max(1, list.data.pages) : null;
  if (serverPages != null && page > serverPages) setPage(serverPages);
  const denied = list.isError && !list.data && isAxiosError(list.error) && list.error.response?.status === 403;

  const header = <PageHeader title={t('registrations.title')} subtitle={t('registrations.subtitle')} />;
  if (denied) {
    return (
      <Screen>
        {header}
        <Card>
          <EmptyState title={t('registrations.noAccess')} message={t('registrations.noAccessHint')} pose="sad" />
        </Card>
      </Screen>
    );
  }

  const statusLabel = (s: string) => t(`registrations.status_${s}`, { defaultValue: s });
  const rows = list.data?.items ?? [];
  const renderRows = () => {
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={260} />;
    if (!rows.length) {
      return debounced.trim() ? (
        <EmptyState title={t('common.noMatch')} message={t('common.noMatchHint')} />
      ) : (
        <EmptyState title={t('registrations.empty')} message={t('registrations.emptyHint')} />
      );
    }
    return rows.map((r) => {
      const badge = (
        <Badge
          testID={`registration-status-${r.id}`}
          label={statusLabel(r.status)}
          tone={registrationStatusTone(r.status)}
        />
      );
      // «Ko'rib chiqildi» faqat ko'rib chiqilganlar ro'yxatida ma'noli (v2).
      const reviewed = status !== 'pending' && r.reviewed_at ? formatTashkentDate(r.reviewed_at) : null;
      return (
        <ListRow
          key={r.id}
          testID={`registration-row-${r.id}`}
          left={<Avatar name={r.full_name || '?'} uri={r.photo_url} size={36} />}
          title={r.full_name || '—'}
          subtitle={[r.username || r.email, claimText(r, t('registrations.guest')), reviewed]
            .filter(Boolean)
            .join(' · ')}
          below={compact ? <View style={styles.below}>{badge}</View> : undefined}
          right={compact ? undefined : badge}
          onPress={() => setViewing({ row: r, n: Date.now() })}
        />
      );
    });
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
        {header}
        <View style={styles.controls}>
          <Segmented
            testID="registrations-status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={REGISTRATION_FILTERS.map((s) => ({
              value: s,
              label: s === 'all' ? t('registrations.allStatuses') : statusLabel(s),
            }))}
          />
          <SearchField
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={t('registrations.searchPlaceholder')}
          />
        </View>
        <Card>
          {!!list.data && (
            <Text variant="caption" tone="subtle" style={styles.total} testID="registrations-total">
              {t('registrations.total', { count: list.data.total })}
            </Text>
          )}
          {renderRows()}
          <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />
        </Card>
      </Screen>
      {viewing && <RegistrationSheet key={viewing.n} row={viewing.row} onClose={() => setViewing(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: { gap: 10, marginBottom: 12 },
  below: { marginTop: 4 },
  total: { marginBottom: 4 },
});
