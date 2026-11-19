import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, type ImageStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { ff } from '@/theme/typography';
import { Icon } from './Icon';
import { useBreakpoint } from '../utils/responsive';
import { KeyboardAvoider } from './KeyboardAvoider';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { useThumbFallback } from '../lib/useThumbFallback';
import { foldText } from '@/utils/searchFold';

export interface PickerOption {
  value: number;
  label: string;
  subLabel?: string;
  photo?: string | null;
  /** Kichik nusxa (`photo_thumb_path`) — bo'lsa shu yuklanadi, xatoda `photo` ga qaytadi. */
  photoThumb?: string | null;
}

// expo-image (xotira+disk keshi) + kichik nusxa: 50 qatorlik sahifa ~1.35 MB → ~80 KB.
// Ikkala surat ham ochilmasa — bosh harf (bo'sh kulrang doira emas).
function PickerPhoto({ thumb, full, style, fallback }: {
  thumb?: string | null; full?: string | null; style: ImageStyle; fallback: React.ReactElement;
}) {
  const { uri, key, onError } = useThumbFallback(thumb, full);
  return uri ? <Image key={key} testID="picker-photo" source={{ uri }} onError={onError} style={style} cachePolicy="memory-disk" /> : fallback;
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
  /** Values that render selected but cannot be toggled off — used where the
   *  server refuses the change (e.g. a coordinator who already agreed: the
   *  letter save would fail with `agreement_locked`). Shown dimmed with a lock
   *  icon so the row explains itself instead of silently ignoring taps. */
  disabledValues?: number[];
  /** SERVER search: when given, the box no longer filters `options` locally
   *  — the caller receives the text (already debounced here) and re-queries
   *  the API with it. Used for organisation-wide employee pickers, which used
   *  to download every page (15 × 100 rows) just to filter in JS. */
  onSearchChange?: (query: string) => void;
  /** Server sahifalash: ro'yxat oxiriga yetganda keyingi sahifa (ilgari faqat 1-sahifa —
   *  30/100 ta — ko'rinib, qolgani «kesilib» qolardi; 2026-10-06). `useInfinitePicker` beradi. */
  onEndReached?: () => void;
  /** Keyingi sahifa yuklanmoqda — ro'yxat ostida spinner. */
  loadingMore?: boolean;
  /** Bosh harfli avatar (odamlar ro'yxati). Soat / daqiqa / holat kabi ro'yxatlarda
   *  `false` — aks holda har qatorda ma'nosiz «0», «1» doirasi chiziladi. */
  avatars?: boolean;
}

export function PickerModal({
  visible, title, options, loading, multiple, selected, onClose, onSelect, onToggle,
  disabledValues, onSearchChange, avatars = true, onEndReached, loadingMore,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const bp = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  useEffect(() => {
    onSearchChange?.(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const filtered = useMemo(() => {
    if (onSearchChange) return options; // server already filtered
    const q = foldText(search.trim());
    if (!q) return options;
    return options.filter(
      (o) => foldText(o.label).includes(q) || foldText((o.subLabel ?? '')).includes(q)
    );
  }, [options, search, onSearchChange]);

  const isSelected = (v: number) =>
    multiple ? Array.isArray(selected) && selected.includes(v) : selected === v;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Qidiruv maydoni SHU OYNA ICHIDA — klaviatura ochilganda ro'yxatni
          ham, ko'p tanlovdagi "Tayyor" tugmasini ham to'sib qo'yardi
          (Modal ota-ekrandagi KeyboardAvoidingView ni MEROS OLMAYDI).
          Pastki xavfsiz zona ham shu yerda qo'shiladi: Android edge-to-edge
          da oxirgi qator navigatsiya paneli ostida qolib ketardi. */}
      <KeyboardAvoider style={[styles.overlay, bp.isTablet && styles.overlayCentered]}>
        <View
          style={[
            styles.sheet,
            bp.isTablet && styles.sheetTablet,
            { paddingBottom: 20 + (bp.isTablet ? 0 : insets.bottom) },
          ]}
        >
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
              testID="picker-list"
              onEndReached={onEndReached}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primaryLight} /> : null}
              initialNumToRender={20}
              windowSize={9}
              renderItem={({ item }) => {
                const sel = isSelected(item.value);
                const locked = !!disabledValues?.includes(item.value);
                return (
                  <TouchableOpacity
                    style={[styles.row, sel && styles.rowActive, locked && styles.rowLocked]}
                    activeOpacity={locked ? 1 : 0.8}
                    disabled={locked}
                    accessibilityState={{ selected: sel, disabled: locked }}
                    onPress={() => {
                      if (locked) return;
                      if (multiple) onToggle?.(item.value);
                      else onSelect(item.value);
                    }}
                  >
                    {!avatars ? null : (
                      <PickerPhoto
                        thumb={item.photoThumb}
                        full={item.photo}
                        style={styles.photo}
                        fallback={
                          <View style={styles.photoPlaceholder}>
                            <Text style={styles.photoInitial}>{item.label.charAt(0).toUpperCase()}</Text>
                          </View>
                        }
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, sel && styles.labelActive]} numberOfLines={1}>{item.label}</Text>
                      {!!item.subLabel && <Text style={styles.subLabel} numberOfLines={1}>{item.subLabel}</Text>}
                    </View>
                    {locked
                      ? <Icon name="lock" size={16} color={colors.textMuted} />
                      : sel && <Icon name="check" size={18} color={colors.primary} />}
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
              {/* Nechta tanlanganini SHU YERDA ko'rsatamiz — foydalanuvchi
                  oynani yopmasdan turib nazorat qiladi. */}
              <Text style={styles.doneText}>
                {t('common.done')}
                {Array.isArray(selected) && selected.length ? ` · ${selected.length}` : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    overlayCentered: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%', paddingBottom: 20 },
    sheetTablet: {
      width: '100%', maxWidth: 520, borderRadius: 24,
      borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%',
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 2, borderBottomColor: c.cardBorder },
    title: { fontSize: 16, ...ff('800'), color: c.text, flex: 1, marginRight: 8 },
    close: { fontSize: 18, color: c.textMuted, ...ff('700') },
    searchWrap: { paddingHorizontal: 16, paddingVertical: 12 },
    search: { backgroundColor: c.bg, borderRadius: 12, borderWidth: 2, borderColor: c.cardBorder, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: c.text, ...ff('700') },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: c.cardBorder },
    rowActive: { backgroundColor: c.primarySoft },
    // Locked rows stay readable but visibly inert (see `disabledValues`).
    rowLocked: { opacity: 0.55 },
    photo: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.skeleton },
    photoPlaceholder: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    photoInitial: { color: c.primary, ...ff('800'), fontSize: 15 },
    label: { fontSize: 14, ...ff('700'), color: c.text },
    labelActive: { color: c.primary },
    subLabel: { fontSize: 12, color: c.textMuted, marginTop: 2, ...ff('700') },
    check: { fontSize: 18, color: c.primary, ...ff('900') },
    empty: { alignItems: 'center', paddingTop: 36 },
    emptyText: { color: c.textMuted, fontSize: 14, ...ff('700') },
    doneBtn: { marginHorizontal: 16, marginTop: 10, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: c.primaryShadow },
    doneText: { color: c.onPrimary, fontSize: 15, ...ff('800') },
  });
