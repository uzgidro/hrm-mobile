// Ro'yxat filtrlari — qidiruv + bitta «Filtr» tugmasi (2026-10-06, foydalanuvchi: «Bildirgi va
// buyruqlarda filterlar odamni chalg'itadi» — ilgari qidiruv ostida IKKI gorizontal aylanadigan chip
// qatori (tur + holat) turardi, «Menda / Mening / Barchasi» bilan birga 3 qator). Endi tur va holat
// varaqda tanlanadi; tanlanganlari qidiruv ostida bitta qatorda, ✕ bilan olib tashlanadigan chip
// bo'lib ko'rinadi — hech narsa tanlanmagan bo'lsa qator yo'q.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Button, Chip, Sheet, Text } from '@/ui';
import { Icon } from './Icon';
import { SearchBox } from './SearchBox';

export type FilterGroup = {
  key: string;
  title: string;
  /** «Barchasi» qiymati — tanlanmagan holat. */
  allValue: string;
  allLabel: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
};

export function ListFilterBar({
  search,
  onSearch,
  placeholder,
  groups,
  testID = 'list-filters',
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  groups: FilterGroup[];
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  const active = groups.filter((g) => g.value !== g.allValue);
  const labelOf = (g: FilterGroup) => g.options.find((o) => o.value === g.value)?.label ?? g.value;

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <SearchBox value={search} onChangeText={onSearch} placeholder={placeholder} />
        </View>
        <Pressable
          testID={`${testID}-open`}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={active.length ? t('common.filtersCount', { count: active.length }) : t('common.filters')}
          style={[
            styles.btn,
            { backgroundColor: active.length ? c.brandSoft : c.inputBg, borderColor: active.length ? c.brand : c.border },
          ]}
        >
          <Icon name="filter" size={20} color={active.length ? c.brandStrong : c.fgMuted} />
          {active.length > 0 && (
            <View style={[styles.badge, { backgroundColor: c.brand }]}>
              <Text variant="caption" style={{ color: c.fgOnBrand, fontWeight: '800' }}>
                {active.length}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {active.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeRow} style={styles.activeScroll}>
          {active.map((g) => (
            <Pressable
              key={g.key}
              testID={`${testID}-active-${g.key}`}
              onPress={() => g.onChange(g.allValue)}
              accessibilityRole="button"
              accessibilityLabel={`${labelOf(g)} — ${t('common.clear')}`}
              style={[styles.activeChip, { backgroundColor: c.brandSoft }]}
            >
              <Text variant="caption" style={{ color: c.brandStrong, fontWeight: '700' }} numberOfLines={1}>
                {labelOf(g)}
              </Text>
              <Icon name="close" size={12} color={c.brandStrong} strokeWidth={2.6} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('common.filters')}>
        <View style={styles.sheet}>
          {groups.map((g) => (
            <View key={g.key} style={styles.group}>
              <Text variant="label" tone="muted">
                {g.title}
              </Text>
              <View style={styles.chips}>
                {[{ value: g.allValue, label: g.allLabel }, ...g.options].map((o) => (
                  <Chip
                    key={o.value}
                    testID={`${testID}-${g.key}-${o.value}`}
                    label={o.label}
                    selected={g.value === o.value}
                    onPress={() => g.onChange(o.value)}
                  />
                ))}
              </View>
            </View>
          ))}
          <View style={styles.footer}>
            <View style={styles.flex}>
              <Button
                label={t('common.clear')}
                variant="ghost"
                full
                disabled={!active.length}
                onPress={() => groups.forEach((g) => g.onChange(g.allValue))}
              />
            </View>
            <View style={styles.flex}>
              <Button testID={`${testID}-apply`} label={t('common.filtersApply')} full onPress={() => setOpen(false)} />
            </View>
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  btn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeScroll: { flexGrow: 0 },
  activeRow: { gap: 6, alignItems: 'center' },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    maxWidth: 260,
  },
  sheet: { gap: 16, paddingBottom: 8 },
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
