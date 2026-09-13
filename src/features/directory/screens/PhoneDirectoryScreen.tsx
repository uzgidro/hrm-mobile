import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { useBreakpoint } from '@/utils/responsive';
import { findExecutiveBranchId } from '@/utils/branch';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { PagedList } from '@/components/PagedList';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { SearchBox } from '@/components/SearchBox';
import type { PhoneDirectoryEntry } from '@/types';
import { phoneDirectoryQuery, directoryBranchesQuery } from '../api/queries';

type Scope = 'exec' | 'system';

// Company phone book: one flat, server-paged list; server search by name /
// position / department / phone. Open to every role (no PII). Tapping a phone dials it.
export default function PhoneDirectoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  const cols = bp.isTablet ? (bp.isLandscape ? 3 : 2) : 1;
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');

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

  /* Serverdan FAQAT ko'rinadigan ko'lam so'raladi (audit 2026-09-07), 30
   * tadan (2026-09-13): "Ijro apparati" → bosh apparat, bitta filial → o'sha
   * filial, "Barcha filiallar" → bosh apparatdan TASHQARI hammasi
   * (`exclude_branch_id`). Qidiruv esa BUTUN TASHKILOT bo'ylab, SERVERDA
   * (ism/lavozim/bo'lim/telefon, kirill-lotin folding) — ilgari 2 harf
   * yozilishi bilan 2.5 MB tortilib JS'da filtrlanardi.
   *
   * `enabled`: filiallar ro'yxati kelmaguncha "Ijro apparati" ning id'si
   * noma'lum — filtrsiz (ya'ni butun tashkilotli) so'rov yubormaslik uchun
   * kutamiz. */
  const debouncedSearch = useDebouncedValue(search);
  const isSearching = debouncedSearch.trim().length >= 2;
  const scopeReady = executiveBranchId != null || branches.length === 0;
  const query = useInfiniteQuery({
    ...phoneDirectoryQuery(
      isSearching
        ? { search: debouncedSearch }
        : scope === 'exec'
          ? { branchId: executiveBranchId }
          : systemBranchId != null
            ? { branchId: systemBranchId }
            : { excludeBranchId: executiveBranchId },
    ),
    enabled: isSearching || scopeReady,
  });

  const dial = (phone: string) => Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);

  /* IKKI RAQAMLI TANLOV (foydalanuvchi so'rovi 2026-09-07).
   *
   * Qator ilgari `internal_phone_number || phone_number` ko'rsatardi, ya'ni
   * ichki raqami bor xodimning SHAXSIY raqamiga umuman yetib bo'lmasdi —
   * foydalanuvchi aynan shuni xabar qildi ("ba'zida ichki raqam o'rniga
   * o'zining telefon raqami kerak bo'ladi, buni ko'rishning iloji yo'q").
   *
   * Endi ikkalasi ham bo'lsa bosish tanlov oynasini ochadi. Bitta raqam
   * bo'lsa eski xulq: to'g'ridan-to'g'ri qo'ng'iroq, ortiqcha bosish yo'q. */
  const [picker, setPicker] = useState<PhoneDirectoryEntry | null>(null);
  const onPhonePress = (entry: PhoneDirectoryEntry) => {
    const nums = phoneNumbers(entry);
    if (nums.length === 1) dial(nums[0].value);
    else if (nums.length > 1) setPicker(entry);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title={t('directory.title')} />

      <View style={styles.searchWrapper}>
        <SearchBox value={search} onChangeText={setSearch} placeholder={t('directory.searchPlaceholder')} />
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

      <PagedList
        query={query}
        keyExtractor={(item) => String(item.id)}
        numColumns={cols}
        columnWrapperStyle={cols > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={cols > 1 ? undefined : () => <View style={styles.separator} />}
        emptyIcon="users"
        emptyTitle={search ? t('directory.notFound') : t('directory.empty')}
        renderItem={(item) => <DirectoryRow entry={item} styles={styles} colors={colors} onPress={onPhonePress} t={t} grid={cols > 1} />}
      />

      <PhonePicker
        entry={picker}
        onClose={() => setPicker(null)}
        onDial={(n) => { setPicker(null); dial(n); }}
        styles={styles}
        colors={colors}
        t={t}
      />
    </Screen>
  );
}

/** Bitta xodimning mavjud raqamlari — ichki birinchi (ish uchun ko'proq kerak). */
function phoneNumbers(e: PhoneDirectoryEntry): { key: 'internal' | 'personal'; value: string }[] {
  const out: { key: 'internal' | 'personal'; value: string }[] = [];
  if (e.internal_phone_number) out.push({ key: 'internal', value: e.internal_phone_number });
  if (e.phone_number) out.push({ key: 'personal', value: e.phone_number });
  return out;
}

/* Tanlov oynasi. `ModalCard` ISHLATILMADI: u "Bekor qilish / Tasdiqlash"
 * juftligi uchun qurilgan, bu yerda esa TANLOVNING O'ZI amal — tasdiqlash
 * tugmasi ortiqcha qadam bo'lardi. Shakl tokenlari (overlay, karta radiusi,
 * padding) o'sha komponentnikiga mos, shuning uchun ko'rinish ajralib
 * turmaydi. */
function PhonePicker({
  entry, onClose, onDial, styles, colors, t,
}: {
  entry: PhoneDirectoryEntry | null;
  onClose: () => void;
  onDial: (phone: string) => void;
  styles: Styles;
  colors: ThemeColors;
  t: TFunction;
}) {
  const nums = entry ? phoneNumbers(entry) : [];
  return (
    <Modal visible={!!entry} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.pickerCard} activeOpacity={1}>
          <Text style={styles.pickerTitle} numberOfLines={2}>{entry?.legal_name || t('directory.callTitle')}</Text>
          <Text style={styles.pickerHint}>{t('directory.callTitle')}</Text>
          {nums.map((n) => (
            <TouchableOpacity
              key={n.key}
              style={styles.pickerItem}
              onPress={() => onDial(n.value)}
              activeOpacity={0.7}
              testID={`phone-${n.key}`}
            >
              <Icon name="phone" size={18} color={colors.primary} />
              <View style={styles.pickerItemText}>
                <Text style={styles.pickerLabel}>
                  {n.key === 'internal' ? t('directory.phoneInternal') : t('directory.phonePersonal')}
                </Text>
                <Text style={styles.pickerNumber} selectable>{n.value}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.pickerCancel} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.pickerCancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function DirectoryRow({
  entry, styles, colors, onPress, t, grid,
}: {
  entry: PhoneDirectoryEntry;
  styles: Styles;
  colors: ThemeColors;
  onPress: (entry: PhoneDirectoryEntry) => void;
  t: TFunction;
  grid?: boolean;
}) {
  const nums = phoneNumbers(entry);
  const phone = nums[0]?.value;
  const hasBoth = nums.length > 1;
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
        <TouchableOpacity style={styles.phoneBtn} onPress={() => onPress(entry)} activeOpacity={0.7}>
          <Icon name="phone" size={16} color={colors.primary} />
          {/* Bitta raqamda `selectable` matn nusxa olishga qulay; ikkita
              bo'lganda esa bosish tanlov oynasini ochishi kerak, `selectable`
              esa bosishni yutib yuboradi. */}
          <Text style={styles.phoneText} selectable={!hasBoth}>{phone}</Text>
          {hasBoth && <View style={styles.phoneBadge}><Text style={styles.phoneBadgeText}>2</Text></View>}
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
    searchWrapper: {
      paddingHorizontal: 16, paddingVertical: 10, flexShrink: 0,
      borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },

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

    list: { paddingHorizontal: 0, paddingTop: 4, paddingBottom: 32 },
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
    // "2" belgisi — qatorda ikkinchi raqam borligini bildiradi, aks holda
    // foydalanuvchi bosish tanlov ochishini bilmaydi.
    phoneBadge: {
      minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
      backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    },
    phoneBadgeText: { fontSize: 10, fontWeight: '800', color: c.onPrimary },

    // Tanlov oynasi — o'lchamlari `ModalCard` bilan bir xil (radius 18,
    // padding 20, gap 10, paddingHorizontal 24), shunda ilova ichida
    // begona ko'rinmaydi.
    pickerOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', paddingHorizontal: 24 },
    pickerCard: {
      backgroundColor: c.card, borderRadius: 18, padding: 20, gap: 10,
      borderWidth: 1, borderColor: c.cardBorder,
    },
    pickerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    pickerHint: { fontSize: 12, color: c.textMuted },
    pickerItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
      backgroundColor: c.primarySoft,
    },
    pickerItemText: { flex: 1, gap: 2 },
    pickerLabel: { fontSize: 11, color: c.textMuted, fontWeight: '600' },
    pickerNumber: { fontSize: 16, fontWeight: '700', color: c.primary },
    pickerCancel: {
      paddingVertical: 12, borderRadius: 12, alignItems: 'center',
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, marginTop: 4,
    },
    pickerCancelText: { color: c.text, fontSize: 14, fontWeight: '600' },
  });
