// Tanlangan ma'lumotnoma (v2 o'ng paneli): sarlavha (nom / ruscha nom, kod, «Tizim», izoh, nega faqat
// o'qiladi), server qidiruvi, holat filtri (tashqi manbada yo'q), tegishli yozuv filtri (ierarxikda),
// yozuvlar (nom, ruscha nom · tegishli · kod, holat nishoni) 25 tadan sahifalab; qator → varaq (tafsilot,
// tahrir, o'chirish — «qayerda ishlatilyapti» bilan tasdiq). Import/eksport — web'da.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import type { DictionaryType } from '@/utils/dictionaries';
import { useBreakpoint } from '@/utils/responsive';
import { PickerModal } from '@/components/PickerModal';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ListRow,
  Pager,
  SearchField,
  SelectField,
  Sheet,
  Skeleton,
  Text,
} from '@/ui';
import { dictionaryEntriesQuery, dictionaryOptionsQuery, fetchEntryUsage } from '../api/queries';
import { useDeleteEntry } from '../api/mutations';
import {
  entrySubtitle,
  isReadOnly,
  usageLines,
  type DictionaryEntry,
  type DictionaryUsage,
  type StatusFilter,
} from '../utils/dictionaries';
import { KeyValue } from './DictionariesBits';
import { EntryFormSheet } from './EntryFormSheet';
import { TypeMarks } from './TypeList';

type Open =
  { kind: 'view'; row: DictionaryEntry; n: number } | { kind: 'form'; row: DictionaryEntry | null; n: number } | null;

const NONE = -1;

function StatusBadge({ row }: { row: DictionaryEntry }) {
  const { t } = useTranslation();
  return row.is_active === false ? (
    <Badge label={t('dictionaries.inactive')} />
  ) : (
    <Badge label={t('dictionaries.active')} tone="success" />
  );
}

export function EntriesView({ type, manage, onBack }: { type: DictionaryType; manage: boolean; onBack: () => void }) {
  const { t } = useTranslation();
  const compact = useBreakpoint().sizeClass === 'compact';
  const readOnly = isReadOnly(type, manage);
  const hierarchical = !!type.is_hierarchical;
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState<StatusFilter>('');
  const [parentId, setParentId] = useState<number | null>(null);
  // Sahifa filtrga bog'liq: qidiruv, holat yoki tegishli yozuv o'zgarsa — yana 1-sahifa (ma'lumotnoma
  // almashsa komponent `key` bilan qayta yaratiladi).
  const filterKey = [debounced, status, parentId ?? ''].join('|');
  const [pg, setPg] = useState({ key: filterKey, n: 1 });
  const page = pg.key === filterKey ? pg.n : 1;
  const setPage = (n: number) => setPg({ key: filterKey, n });
  const [pickingParent, setPickingParent] = useState(false);
  const [open, setOpen] = useState<Open>(null);

  const list = useQuery(dictionaryEntriesQuery(type.code, { page, search: debounced, parentId, status }));
  // Sahifa serverdagi sahifalar sonidan oshmasin: oxirgi sahifaning yagona yozuvi o'chirilgach ro'yxat
  // bo'sh qolib, Pager yashirinib qolardi — oxirgi mavjud sahifaga qaytamiz (render paytidagi tuzatish).
  const serverPages = list.isSuccess && !list.isPlaceholderData ? Math.max(1, list.data.pages) : null;
  if (serverPages != null && pg.key === filterKey && pg.n > serverPages) setPg({ key: filterKey, n: serverPages });
  const parents = useQuery({
    ...dictionaryOptionsQuery(type.parent_type_code ?? ''),
    enabled: hierarchical && !!type.parent_type_code,
  });
  const parentRows = parents.data ?? [];
  const filtered = !!debounced.trim() || !!status || parentId != null;

  const rows = list.data?.items ?? [];
  const renderRows = () => {
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={240} />;
    if (!rows.length) {
      return filtered ? (
        <EmptyState
          title={t('common.noMatch')}
          message={debounced.trim() ? t('dictionaries.emptySearch') : t('common.noMatchHint')}
          action={{
            label: t('common.clearFilters'),
            onPress: () => {
              setSearch('');
              setStatus('');
              setParentId(null);
            },
          }}
        />
      ) : (
        <EmptyState title={t('dictionaries.empty')} message={readOnly ? undefined : t('dictionaries.emptyHint')} />
      );
    }
    return rows.map((r) => (
      <ListRow
        key={r.id}
        testID={`dict-entry-${r.id}`}
        title={r.name || r.code}
        subtitle={entrySubtitle(r, hierarchical) || undefined}
        below={
          compact ? (
            <View style={styles.below}>
              <StatusBadge row={r} />
            </View>
          ) : undefined
        }
        right={compact ? undefined : <StatusBadge row={r} />}
        chevron
        onPress={() => setOpen({ kind: 'view', row: r, n: Date.now() })}
      />
    ));
  };

  return (
    <View style={styles.root}>
      <View style={styles.backRow}>
        <Button
          testID="dict-back"
          label={t('dictionaries.allTypes')}
          icon="chevronLeft"
          variant="link"
          size="sm"
          onPress={onBack}
        />
      </View>
      <Card testID="dict-head">
        <Text variant="heading">{type.name || type.code}</Text>
        {!!type.name_ru && (
          <Text variant="caption" tone="muted">
            {type.name_ru}
          </Text>
        )}
        <View style={styles.marks}>
          <Badge label={type.code} />
          <TypeMarks type={type} withSystem />
        </View>
        {!!type.description && (
          <Text variant="caption" tone="muted" style={styles.desc}>
            {type.description}
          </Text>
        )}
        {readOnly && (
          <Text variant="caption" tone="subtle" style={styles.desc} testID="dict-read-only">
            {type.external_source
              ? t('dictionaries.externalHint')
              : !type.is_editable
                ? t('dictionaries.lockedHint')
                : t('dictionaries.readOnlyHint')}
          </Text>
        )}
      </Card>

      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder={t('dictionaries.searchEntry')}
      />
      {!type.external_source && (
        <View style={styles.chips}>
          {(['', 'active', 'inactive'] as const).map((s) => (
            <Chip
              key={s || 'all'}
              testID={`dict-status-${s || 'all'}`}
              label={s ? t(`dictionaries.${s}`) : t('dictionaries.allStatuses')}
              selected={status === s}
              onPress={() => setStatus(s)}
            />
          ))}
        </View>
      )}
      {hierarchical && parentRows.length > 0 && (
        <SelectField
          testID="dict-parent-filter"
          label={t('dictionaries.colParent')}
          value={parentId == null ? '' : (parentRows.find((p) => p.id === parentId)?.name ?? `#${parentId}`)}
          placeholder={t('dictionaries.allParents')}
          icon="folder"
          onPress={() => setPickingParent(true)}
        />
      )}
      <View style={styles.bar}>
        <Text variant="caption" tone="subtle" style={styles.flex} testID="dict-entries-total">
          {list.data ? t('dictionaries.entryCount', { count: list.data.total }) : ''}
        </Text>
        {!readOnly && (
          <Button
            testID="dict-entry-new"
            label={t('dictionaries.add')}
            icon="plus"
            size="sm"
            onPress={() => setOpen({ kind: 'form', row: null, n: Date.now() })}
          />
        )}
      </View>
      <Card>
        {renderRows()}
        <Pager page={page} pages={list.data?.pages ?? 1} onPage={setPage} />
      </Card>
      <Text variant="caption" tone="subtle">
        {t('dictionaries.webOnly')}
      </Text>

      {pickingParent && (
        <PickerModal
          visible
          title={t('dictionaries.colParent')}
          options={[
            { value: NONE, label: t('dictionaries.allParents') },
            ...parentRows.map((p) => ({ value: p.id, label: p.name })),
          ]}
          selected={parentId ?? NONE}
          onClose={() => setPickingParent(false)}
          onSelect={(v) => {
            setPickingParent(false);
            setParentId(v === NONE ? null : v);
          }}
        />
      )}
      {open?.kind === 'view' && (
        <EntrySheet
          key={open.n}
          row={open.row}
          hierarchical={hierarchical}
          readOnly={readOnly}
          onEdit={() => setOpen({ kind: 'form', row: open.row, n: Date.now() })}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.kind === 'form' && (
        <EntryFormSheet key={open.n} type={type} entry={open.row} parents={parentRows} onClose={() => setOpen(null)} />
      )}
    </View>
  );
}

function EntrySheet({
  row,
  hierarchical,
  readOnly,
  onEdit,
  onClose,
}: {
  row: DictionaryEntry;
  hierarchical: boolean;
  readOnly: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteEntry();
  const [checking, setChecking] = useState(false);
  const name = row.name || row.code;

  const del = async () => {
    // Bog'liqlik — maslahat: so'rov yiqilsa ham o'chirishning o'zi (server 409) hal qiladi (v2).
    let usage: DictionaryUsage | null = null;
    setChecking(true);
    try {
      usage = await fetchEntryUsage(row.id);
    } catch {
      usage = null;
    } finally {
      setChecking(false);
    }
    const lines = usageLines(usage);
    const ok = await confirm({
      title: t('dictionaries.deleteTitle'),
      message: [
        t('dictionaries.deleteConfirm', { name }),
        ...(lines.length ? ['', t('dictionaries.inUse'), ...lines, '', t('dictionaries.inUseHint')] : []),
      ].join('\n'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success(t('dictionaries.deleted'));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('dictionaries.deleteFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={name}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <KeyValue label={t('dictionaries.colNameRu')} value={row.name_ru} />
        {hierarchical && <KeyValue label={t('dictionaries.colParent')} value={row.parent_name} />}
        <KeyValue label={t('dictionaries.colCode')} value={row.code} testID="dict-entry-code" />
        <KeyValue label={t('dictionaries.colDescription')} value={row.description} />
        <KeyValue label={t('dictionaries.colSort')} value={String(row.sort_order ?? 0)} />
        <KeyValue
          label={t('dictionaries.colStatus')}
          value={row.is_active === false ? t('dictionaries.inactive') : t('dictionaries.active')}
        />
        {!readOnly && (
          <>
            <Button testID="dict-entry-edit" label={t('common.edit')} icon="edit" onPress={onEdit} full />
            <Button
              testID="dict-entry-delete"
              label={t('common.delete')}
              icon="trash"
              variant="dangerGhost"
              onPress={() => void del()}
              loading={checking || remove.isPending}
              full
            />
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  backRow: { flexDirection: 'row' },
  marks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 },
  desc: { marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 160 },
  below: { marginTop: 4 },
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
});
