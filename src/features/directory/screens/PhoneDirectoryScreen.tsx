import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Linking, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { useBreakpoint } from '@/utils/responsive';
import { findExecutiveBranchId } from '@/utils/branch';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { LoadingView, EmptyState, ErrorState } from '@/components/StateViews';
import type { PhoneDirectoryEntry } from '@/types';
import { phoneDirectoryQuery, directoryBranchesQuery } from '../api/queries';

type Scope = 'exec' | 'system';

// Company phone book: one flat list, client-side search by name / position /
// department. Open to every role (no PII). Tapping a phone dials it.
export default function PhoneDirectoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  const cols = bp.isTablet ? (bp.isLandscape ? 3 : 2) : 1;
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');

  const { data = [], isLoading, isError, refetch } = useQuery(phoneDirectoryQuery());
  const { data: branches = [] } = useQuery(directoryBranchesQuery());

  const executiveBranchId = useMemo(() => findExecutiveBranchId(branches), [branches]);
  const systemBranches = useMemo(
    () => branches
      .filter((b) => b.id !== executiveBranchId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'uz')),
    [branches, executiveBranchId],
  );

  // Scope defaults to the user's own world: a filial employee opens on "Tizim
  // tashkilotlari" with their own branch pre-selected; everyone else on "Ijro
  // apparati" (web TabelPage autoScope parity).
  const ownBranchId =
    user?.employee?.department?.organization_branch_id ??
    user?.employee?.organization_branches?.[0]?.id ??
    null;
  const autoScope: Scope = ownBranchId != null && ownBranchId !== executiveBranchId ? 'system' : 'exec';
  const [scopeChoice, setScopeChoice] = useState<Scope | null>(null);
  const [branchChoice, setBranchChoice] = useState<number | null | undefined>(undefined);
  const scope = scopeChoice ?? autoScope;
  const systemBranchId =
    branchChoice !== undefined
      ? branchChoice
      : scopeChoice == null && autoScope === 'system' ? ownBranchId : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Scope first (Ijro apparati vs Tizim tashkilotlari + optional single branch),
    // then the free-text search — web TabelPage visibleEmployees parity.
    const inScope = scope === 'exec'
      ? data.filter((e) => e.branch_id === executiveBranchId)
      : data.filter((e) =>
          e.branch_id !== executiveBranchId &&
          (systemBranchId == null || e.branch_id === systemBranchId));
    if (!q) return inScope;
    return inScope.filter((e) =>
      (e.legal_name?.toLowerCase().includes(q) ?? false) ||
      (e.job_position_name?.toLowerCase().includes(q) ?? false) ||
      (e.department_name?.toLowerCase().includes(q) ?? false) ||
      (e.internal_phone_number?.toLowerCase().includes(q) ?? false) ||
      (e.phone_number?.toLowerCase().includes(q) ?? false),
    );
  }, [data, search, scope, systemBranchId, executiveBranchId]);

  const dial = (phone: string) => Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);

  return (
    <Screen edges={['top', 'bottom']}>
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

      {branches.length > 0 && (
        <View style={styles.filterWrapper}>
          <View style={styles.scopeRow}>
            <ScopeChip label={t('directory.scopeExec')} active={scope === 'exec'}
              onPress={() => { setScopeChoice('exec'); setBranchChoice(undefined); }} styles={styles} />
            <ScopeChip label={t('directory.scopeSystem')} active={scope === 'system'}
              onPress={() => { setScopeChoice('system'); setBranchChoice(null); }} styles={styles} />
          </View>
          {scope === 'system' && systemBranches.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.branchRow}>
              <BranchChip label={t('directory.allBranches')} active={systemBranchId == null}
                onPress={() => setBranchChoice(null)} styles={styles} />
              {systemBranches.map((b) => (
                <BranchChip key={b.id} label={b.name} active={systemBranchId === b.id}
                  onPress={() => setBranchChoice(b.id)} styles={styles} />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState title={t('directory.loadError')} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={filtered}
          key={cols}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={cols > 1 ? undefined : () => <View style={styles.separator} />}
          renderItem={({ item }) => <DirectoryRow entry={item} styles={styles} colors={colors} onDial={dial} t={t} grid={cols > 1} />}
          ListEmptyComponent={
            <EmptyState icon="users" title={search ? t('directory.notFound') : t('directory.empty')} />
          }
        />
      )}
    </Screen>
  );
}

function DirectoryRow({
  entry, styles, colors, onDial, t, grid,
}: {
  entry: PhoneDirectoryEntry;
  styles: Styles;
  colors: ThemeColors;
  onDial: (phone: string) => void;
  t: TFunction;
  grid?: boolean;
}) {
  const phone = entry.internal_phone_number || entry.phone_number;
  return (
    <View style={[styles.row, grid && styles.rowGrid]}>
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

function ScopeChip({ label, active, onPress, styles }: { label: string; active: boolean; onPress: () => void; styles: Styles }) {
  return (
    <TouchableOpacity style={[styles.scopeChip, active && styles.scopeChipActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.scopeChipText, active && styles.scopeChipTextActive]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function BranchChip({ label, active, onPress, styles }: { label?: string | null; active: boolean; onPress: () => void; styles: Styles }) {
  return (
    <TouchableOpacity style={[styles.branchChip, active && styles.branchChipActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.branchChipText, active && styles.branchChipTextActive]} numberOfLines={1}>{label || '—'}</Text>
    </TouchableOpacity>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
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

    filterWrapper: { paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    scopeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
    scopeChip: {
      flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center',
      backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder,
    },
    scopeChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    scopeChipText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    scopeChipTextActive: { color: c.onPrimary },
    branchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' },
    branchChip: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, maxWidth: 220,
    },
    branchChipActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    branchChipText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    branchChipTextActive: { color: c.primary },

    list: { paddingTop: 4, paddingBottom: 32 },
    separator: { height: 1, backgroundColor: c.cardBorder, marginLeft: 76 },
    gridRow: { gap: 12, paddingHorizontal: 16 },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.bg },
    rowGrid: {
      flex: 1, paddingHorizontal: 12, marginHorizontal: 0, marginBottom: 12,
      borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
    },
    info: { flex: 1 },
    name: { fontSize: 14, fontWeight: '700', color: c.text },
    sub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    phoneBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.primarySoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
    phoneText: { fontSize: 13, fontWeight: '700', color: c.primary },
    noPhone: { fontSize: 12, color: c.textMuted },
  });
