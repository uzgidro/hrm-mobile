// Ma'lumotnomalar ro'yxati (v2 chap paneli, TZ D2 «система отображает список доступных справочников»):
// nom / ruscha nom / kod bo'yicha qidiruv (mijozda), yozuvlar soni, belgilar — boshqa moduldan olinadi,
// o'zgarmas, tizim. «Tekshirish» (majburiy ma'lumotnomalarni qayta yaratish) — faqat yozish huquqi bo'lsa.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import type { DictionaryType } from '@/utils/dictionaries';
import { useBreakpoint } from '@/utils/responsive';
import { Badge, Button, Card, EmptyState, ErrorState, ListRow, SearchField, Skeleton, Text } from '@/ui';
import { useSyncCatalog } from '../api/mutations';
import { filterTypes } from '../utils/dictionaries';

/** v2: ro'yxatda — havola (boshqa modul) yoki qulf (o'zgarmas); sarlavhada «Tizim» ham. */
export function TypeMarks({ type, withSystem = false }: { type: DictionaryType; withSystem?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.marks}>
      {!!type.external_source && <Badge label={t('dictionaries.external')} tone="info" />}
      {!type.external_source && !type.is_editable && <Badge label={t('dictionaries.locked')} />}
      {withSystem && !!type.is_system && <Badge label={t('dictionaries.system')} />}
    </View>
  );
}

const hasMarks = (x: DictionaryType) => !!x.external_source || !x.is_editable;

export function TypeList({
  list,
  manage,
  onPick,
}: {
  list: UseQueryResult<DictionaryType[]>;
  manage: boolean;
  onPick: (code: string) => void;
}) {
  const { t } = useTranslation();
  const compact = useBreakpoint().sizeClass === 'compact';
  const [query, setQuery] = useState('');
  const sync = useSyncCatalog();
  const rows = filterTypes(list.data ?? [], query);

  const runSync = async () => {
    const ok = await confirm({
      title: t('dictionaries.sync'),
      message: t('dictionaries.syncHint'),
      confirmLabel: t('dictionaries.sync'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      const res = await sync.mutateAsync();
      toast.success(
        res.types_created || res.entries_created
          ? t('dictionaries.syncAdded', { types: res.types_created, entries: res.entries_created })
          : t('dictionaries.syncComplete'),
      );
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('dictionaries.syncFailed')));
    }
  };

  const renderRows = () => {
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={260} />;
    if (!rows.length) {
      return query.trim() ? (
        <EmptyState
          title={t('common.noMatch')}
          message={t('common.noMatchHint')}
          action={{ label: t('common.clearFilters'), onPress: () => setQuery('') }}
        />
      ) : (
        <EmptyState title={t('dictionaries.noTypes')} />
      );
    }
    return rows.map((x) => (
      <ListRow
        key={x.code}
        testID={`dict-type-${x.code}`}
        title={x.name || x.code}
        subtitle={[x.name_ru, t('dictionaries.entryCount', { count: x.entry_count ?? 0 })].filter(Boolean).join(' · ')}
        below={
          compact && hasMarks(x) ? (
            <View style={styles.below}>
              <TypeMarks type={x} />
            </View>
          ) : undefined
        }
        right={!compact && hasMarks(x) ? <TypeMarks type={x} /> : undefined}
        chevron
        onPress={() => onPick(x.code)}
      />
    ));
  };

  return (
    <View style={styles.root}>
      <SearchField value={query} onChangeText={setQuery} placeholder={t('dictionaries.searchType')} />
      <View style={styles.bar}>
        <Text variant="caption" tone="subtle" style={styles.flex} testID="dict-types-count">
          {list.data ? t('dictionaries.typeCount', { count: rows.length }) : ''}
        </Text>
        {manage && (
          <Button
            testID="dict-sync"
            label={t('dictionaries.sync')}
            icon="refresh"
            size="sm"
            variant="soft"
            onPress={() => void runSync()}
            loading={sync.isPending}
          />
        )}
      </View>
      <Card>{renderRows()}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 160 },
  marks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  below: { marginTop: 4 },
});
