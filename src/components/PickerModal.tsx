import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, FlatList,
  TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { Icon } from './Icon';

export interface PickerOption {
  value: number;
  label: string;
  subLabel?: string;
  photo?: string | null;
}

interface Props {
  visible: boolean;
  title: string;
  options: PickerOption[];
  loading?: boolean;
  multiple?: boolean;
  selected: number | number[] | null;
  onClose: () => void;
  onSelect: (value: number) => void; // single-select: fires then closes
  onToggle?: (value: number) => void; // multi-select: fires, stays open
}

export function PickerModal({
  visible, title, options, loading, multiple, selected, onClose, onSelect, onToggle,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.subLabel ?? '').toLowerCase().includes(q)
    );
  }, [options, search]);

  const isSelected = (v: number) =>
    multiple ? Array.isArray(selected) && selected.includes(v) : selected === v;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Icon name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <TextInput
              style={styles.search}
              placeholder={t('common.search')}
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 36 }} color={colors.primaryLight} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(o) => String(o.value)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const sel = isSelected(item.value);
                return (
                  <TouchableOpacity
                    style={[styles.row, sel && styles.rowActive]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (multiple) onToggle?.(item.value);
                      else onSelect(item.value);
                    }}
                  >
                    {item.photo ? (
                      <Image source={{ uri: item.photo }} style={styles.photo} />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Text style={styles.photoInitial}>{item.label.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, sel && styles.labelActive]} numberOfLines={1}>{item.label}</Text>
                      {!!item.subLabel && <Text style={styles.subLabel} numberOfLines={1}>{item.subLabel}</Text>}
                    </View>
                    {sel && <Icon name="check" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}><Text style={styles.emptyText}>{t('common.notFound')}</Text></View>
              }
            />
          )}

          {multiple && (
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.doneText}>{t('common.done')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%', paddingBottom: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    title: { fontSize: 16, fontWeight: '700', color: c.text, flex: 1, marginRight: 8 },
    close: { fontSize: 18, color: c.textMuted },
    searchWrap: { paddingHorizontal: 16, paddingVertical: 12 },
    search: { backgroundColor: c.bg, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: c.text },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    rowActive: { backgroundColor: c.primarySoft },
    photo: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.skeleton },
    photoPlaceholder: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    photoInitial: { color: c.primary, fontWeight: '700', fontSize: 15 },
    label: { fontSize: 14, fontWeight: '600', color: c.text },
    labelActive: { color: c.primary },
    subLabel: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    check: { fontSize: 18, color: c.primary, fontWeight: '800' },
    empty: { alignItems: 'center', paddingTop: 36 },
    emptyText: { color: c.textMuted, fontSize: 14 },
    doneBtn: { marginHorizontal: 16, marginTop: 10, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    doneText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
  });
