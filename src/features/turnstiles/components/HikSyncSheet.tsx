// HikCentral sinxronizatsiyasi (v2 `HikSyncModal`): ruxsat guruhlari ro'yxati (oxirgi sinxron natijasi —
// filial AKT iga ham ko'rinadi) va to'liq sinxron — qurilmalar → eshiklar → guruhlar. Sinxron butun
// tashkilotni qayta yozadi: faqat GLOBAL administrator (`canRunHikSync`), tasdiq bilan; boshqalarga
// tugma chizilmaydi, o'rniga izoh.
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store/authStore';
import { Badge, Button, EmptyState, ErrorState, ListRow, Sheet, Skeleton, Text } from '@/ui';
import { accessListsQuery } from '../api/queries';
import { useHikSync } from '../api/mutations';
import { canRunHikSync } from '../utils/turnstiles';

export function HikSyncSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canSync = canRunHikSync(user);
  const lists = useQuery(accessListsQuery());
  const sync = useHikSync();

  const run = async () => {
    const ok = await confirm({
      title: t('turnstiles.syncTitle'),
      message: t('turnstiles.syncHint'),
      confirmLabel: t('turnstiles.syncRun'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      await sync.mutateAsync();
      toast.success(t('turnstiles.syncDone'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('turnstiles.syncFailed')));
    }
  };

  const renderLists = () => {
    if (lists.isError && !lists.data) return <ErrorState onRetry={() => lists.refetch()} />;
    if (lists.isPending) return <Skeleton height={120} />;
    if (!lists.data.length) {
      return <EmptyState title={t('turnstiles.accessListsEmpty')} message={t('turnstiles.accessListsEmptyHint')} />;
    }
    return lists.data.map((g) => (
      <ListRow
        key={g.id}
        testID={`access-list-${g.id}`}
        title={g.privilege_group_name || `#${g.id}`}
        right={<Badge label={g.privilege_group_id || '—'} />}
      />
    ));
  };

  return (
    <Sheet visible onClose={onClose} title={t('turnstiles.syncTitle')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <Text variant="caption" tone="muted">
          {t('turnstiles.syncHint')}
        </Text>
        {canSync ? (
          <Button
            testID="hik-sync-run"
            label={t('turnstiles.syncRun')}
            icon="refresh"
            onPress={() => void run()}
            loading={sync.isPending}
            full
          />
        ) : (
          <Text variant="label" tone="muted" testID="hik-sync-global-only">
            {t('turnstiles.syncGlobalOnly')}
          </Text>
        )}
        <Text variant="heading">{t('turnstiles.accessLists')}</Text>
        {renderLists()}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
});
