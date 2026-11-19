// Hisobot parametrining tanlagichi (web v2 `MultiPicker` / `DivisionTreeSelect` / `Combobox`
// o'rnida bitta varaq): qidiruv (mahalliy yoki server), bitta yoki ko'p tanlov, bo'limlar
// daraxti (filial tuguni = barcha bo'limlari). Qiymat turi serverniki (son yoki satr).
// Ota faqat ochiqda va `key` bilan mount qiladi.
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '@/components/Icon';
import { Avatar, Button, SearchField, Sheet, Text } from '@/ui';
import { divisionTree, toggleMany, toggleOne } from '../utils/params';
import type { ReportOption } from '../utils/types';
import { foldText } from '@/utils/searchFold';

type Value = string | number;
type Item =
  | { type: 'option'; option: ReportOption; indent: boolean }
  | { type: 'branch'; option: ReportOption; ids: Value[]; picked: number };

export function OptionsSheet({
  title,
  options,
  loading,
  multiple,
  tree,
  selected,
  onChange,
  onClose,
  onSearchChange,
  hasMore,
  onLoadMore,
  clearable = true,
  testID,
}: {
  title: string;
  options: ReportOption[];
  loading?: boolean;
  multiple: boolean;
  tree?: boolean;
  selected: Value[];
  onChange: (next: Value[]) => void;
  onClose: () => void;
  /** Server qidiruvi (xodimlar): matn ota so'roviga beriladi, mahalliy filtr yo'q. */
  onSearchChange?: (q: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  /** v2 `clearable={!def.required}` — majburiy bitta tanlovni bo'shatib bo'lmaydi. */
  clearable?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [q, setQ] = useState('');
  const isSel = (v: Value) => selected.some((s) => String(s) === String(v));

  const items = useMemo<Item[]>(() => {
    if (tree) {
      const out: Item[] = [];
      for (const n of divisionTree(options, q)) {
        const ids = n.depts.map((d) => d.value);
        out.push({ type: 'branch', option: n.branch, ids, picked: ids.filter(isSel).length });
        for (const d of n.depts) out.push({ type: 'option', option: d, indent: true });
      }
      return out;
    }
    const term = foldText(q.trim());
    const list =
      onSearchChange || !term
        ? options
        : options.filter((o) => foldText(o.label).includes(term) || foldText((o.sub ?? '')).includes(term));
    return list.map((o) => ({ type: 'option', option: o, indent: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, q, tree, selected, onSearchChange]);

  const press = (it: Item) => {
    if (it.type === 'branch') {
      if (!it.ids.length) return;
      onChange(toggleMany(selected, it.ids, it.picked < it.ids.length));
      return;
    }
    if (multiple) onChange(toggleOne(selected, it.option.value));
    else {
      onChange([it.option.value]);
      onClose();
    }
  };

  return (
    <Sheet visible onClose={onClose} title={title}>
      <View style={styles.body} testID={testID}>
        <SearchField
          value={q}
          onChangeText={(v) => {
            setQ(v);
            onSearchChange?.(v.trim());
          }}
          placeholder={t('common.search')}
        />
        <FlatList
          style={styles.list}
          data={loading && !options.length ? [] : items}
          keyExtractor={(it) => `${it.type}:${String(it.option.value)}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: it }) => {
            const on = it.type === 'branch' ? it.ids.length > 0 && it.picked === it.ids.length : isSel(it.option.value);
            const partial = it.type === 'branch' && it.picked > 0 && !on;
            return (
              <Pressable
                testID={`report-option-${String(it.option.value)}`}
                accessibilityRole={multiple ? 'checkbox' : 'button'}
                accessibilityState={{ checked: multiple ? on : undefined, selected: on }}
                onPress={() => press(it)}
                style={[
                  styles.row,
                  { borderBottomColor: c.border },
                  it.type === 'option' && it.indent && styles.indent,
                  on && { backgroundColor: c.brandSoft },
                ]}
              >
                {/* Xodim varianti (backend: photo = kichik nusxa, photo_fallback = to'liq) — avatar. */}
                {it.type === 'option' && (it.option.photo || it.option.photo_fallback) ? (
                  <Avatar name={it.option.label} thumb={it.option.photo} uri={it.option.photo_fallback} size={36} />
                ) : null}
                <View style={styles.text}>
                  <Text variant={it.type === 'branch' ? 'heading' : 'body'} numberOfLines={2}>
                    {it.type === 'branch' && it.ids.length
                      ? `${it.option.label} (${it.picked}/${it.ids.length})`
                      : it.option.label}
                  </Text>
                  {!!it.option.sub && (
                    <Text variant="caption" tone="subtle" numberOfLines={1}>
                      {it.option.sub}
                    </Text>
                  )}
                </View>
                {on ? (
                  <Icon name="check" size={18} color={c.brand} />
                ) : partial ? (
                  <Text variant="label" tone="brand">
                    –
                  </Text>
                ) : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text variant="body" tone="subtle" style={styles.empty}>
              {loading ? '…' : t('reports.noData')}
            </Text>
          }
          ListFooterComponent={
            hasMore && onLoadMore ? (
              <Button
                label={t('reports.loadMore')}
                variant="link"
                size="sm"
                onPress={onLoadMore}
                testID="report-options-more"
              />
            ) : null
          }
        />
        <View style={styles.footer}>
          <Text variant="caption" tone="muted" style={styles.count}>
            {multiple ? t('reports.selectedCount', { count: selected.length }) : ''}
          </Text>
          {clearable && selected.length > 0 && (
            <Button
              label={t('common.clear')}
              variant="link"
              size="sm"
              onPress={() => onChange([])}
              testID="report-options-clear"
            />
          )}
          {multiple && <Button label={t('common.done')} size="sm" onPress={onClose} testID="report-options-done" />}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, flexShrink: 1 },
  list: { maxHeight: 420, flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  indent: { paddingLeft: 24 },
  text: { flex: 1, minWidth: 0 },
  empty: { textAlign: 'center', paddingVertical: 24 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { flex: 1 },
});
