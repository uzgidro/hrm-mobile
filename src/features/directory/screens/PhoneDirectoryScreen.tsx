import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { LoadingView, EmptyState, ErrorState } from '@/components/StateViews';
import type { PhoneDirectoryEntry } from '@/types';
import { phoneDirectoryQuery } from '../api/queries';

// Company phone book: one flat list, client-side search by name / position /
// department. Open to every role (no PII). Tapping a phone dials it.
export default function PhoneDirectoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [search, setSearch] = useState('');

  const { data = [], isLoading, isError, refetch } = useQuery(phoneDirectoryQuery());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    // Match name / position / department AND phone numbers — looking someone up
    // by their internal extension is a primary phone-book use (web parity).
    return data.filter((e) =>
      (e.legal_name?.toLowerCase().includes(q) ?? false) ||
      (e.job_position_name?.toLowerCase().includes(q) ?? false) ||
      (e.department_name?.toLowerCase().includes(q) ?? false) ||
      (e.internal_phone_number?.toLowerCase().includes(q) ?? false) ||
      (e.phone_number?.toLowerCase().includes(q) ?? false),
    );
  }, [data, search]);

  const dial = (phone: string) => Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('directory.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('directory.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState title={t('directory.loadError')} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <DirectoryRow entry={item} styles={styles} colors={colors} onDial={dial} t={t} />}
          ListEmptyComponent={
            <EmptyState icon="users" title={search ? t('directory.notFound') : t('directory.empty')} />
          }
        />
      )}
    </SafeAreaView>
  );
}

function DirectoryRow({
  entry, styles, colors, onDial, t,
}: {
  entry: PhoneDirectoryEntry;
  styles: Styles;
  colors: ThemeColors;
  onDial: (phone: string) => void;
  t: TFunction;
}) {
  const phone = entry.internal_phone_number || entry.phone_number;
  return (
    <View style={styles.row}>
      <EmployeeAvatar emp={{ photo_path: entry.photo_thumb_path ?? entry.photo_path, legal_name: entry.legal_name }} size={48} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{entry.legal_name || '—'}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {entry.job_position_name || entry.department_name || '—'}
        </Text>
      </View>
      {phone ? (
        <TouchableOpacity style={styles.phoneBtn} onPress={() => onDial(phone)} activeOpacity={0.7}>
          <Icon name="phone" size={16} color={colors.primary} />
          <Text style={styles.phoneText} selectable>{phone}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.noPhone}>{t('directory.noPhone')}</Text>
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },

    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: c.text, paddingLeft: 4 },

    searchWrapper: {
      paddingHorizontal: 16, paddingVertical: 10, flexShrink: 0,
      borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card,
      borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, paddingHorizontal: 12, height: 46,
    },
    searchInput: { flex: 1, color: c.text, fontSize: 14 },

    list: { paddingTop: 4, paddingBottom: 32 },
    separator: { height: 1, backgroundColor: c.cardBorder, marginLeft: 76 },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.bg },
    info: { flex: 1 },
    name: { fontSize: 14, fontWeight: '700', color: c.text },
    sub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    phoneBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.primarySoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
    phoneText: { fontSize: 13, fontWeight: '700', color: c.primary },
    noPhone: { fontSize: 12, color: c.textMuted },
  });
