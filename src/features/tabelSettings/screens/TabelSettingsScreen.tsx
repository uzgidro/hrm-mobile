// v3 Tabel sozlamalari — web v2 `TabelSettingsPage` porti: filiallar bo'yicha tabel (Excel), ro'yxat raqami,
// shtamp, rahbarlar va hujjat blanki. Doira v2 kabi: bosh admin va «Barcha filiallar» doirasidagi kadr — hamma
// filial; qolganlar — faqat o'zi boshqaradigan filiallar (`canAdministerBranch`, server `assert_branch_admin`).
// Bitta filial bo'lsa — jadval o'rniga uning sozlamalari to'g'ridan-to'g'ri. Qator → varaq (tasdiqlovchi, imzo
// egalari, shtamp, Excel shablon) → «Tabel sozlash», «Rahbarlar» (faqat direktor / AKT va global rollar),
// «Hujjat blanki».
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { canAdministerBranch } from '@/utils/roles';
import { useBreakpoint } from '@/utils/responsive';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  PageHeader,
  Screen,
  SearchField,
  Sheet,
  Skeleton,
  Text,
} from '@/ui';
import { tabelBranchesQuery, tabelSettingsKeys } from '../api/queries';
import { BlankSheet } from '../components/BlankSheet';
import { ConfigSheet } from '../components/ConfigSheet';
import { LeadersSheet } from '../components/LeadersSheet';
import { KeyValue } from '../components/TabelBits';
import {
  approverOf,
  branchScope,
  filterTabelBranches,
  signersCountOf,
  tabelTemplateName,
  type TabelBranch,
} from '../utils/tabelConfig';

type OpenKind = 'view' | 'config' | 'leaders' | 'blank';
type Open = { kind: OpenKind; id: number; n: number } | null;

export default function TabelSettingsScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const compact = useBreakpoint().sizeClass === 'compact';
  const list = useQuery(tabelBranchesQuery());
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Open>(null);
  const [refreshing, setRefreshing] = useState(false);

  const scope = branchScope(user, list.data ?? []);
  const rights = (b: TabelBranch) => ({
    edit: canAdministerBranch(user, b.id, { execBranchId: scope.execBranchId }),
    leaders: canAdministerBranch(user, b.id, { execBranchId: scope.execBranchId, leadersOnly: true }),
  });
  // Varaqlar filialni ro'yxatdan JONLI o'qiydi — shablon/fayl olib tashlansa holat darhol yangilanadi.
  const target = open ? (list.data ?? []).find((b) => b.id === open.id) : undefined;
  // `n` — varaq kaliti: har ochilishda yangi mount (forma qayta to'ldiriladi).
  const show = (kind: OpenKind, id: number) => setOpen((o) => ({ kind, id, n: (o?.n ?? 0) + 1 }));

  const refresh = async () => {
    setRefreshing(true);
    try {
      await qc.refetchQueries({ queryKey: tabelSettingsKeys.all, type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };

  const actions = (b: TabelBranch, primary: boolean) => {
    const r = rights(b);
    if (!r.edit) {
      return (
        <Text variant="caption" tone="subtle" testID="tabel-read-only">
          {t('tabelSettings.readOnlyHint')}
        </Text>
      );
    }
    return (
      <View style={styles.actions}>
        <Button
          testID="tabel-open-config"
          label={t('tabelSettings.editConfig')}
          icon="settings"
          variant={primary ? 'primary' : 'soft'}
          onPress={() => show('config', b.id)}
          full
        />
        {r.leaders && (
          <Button
            testID="tabel-open-leaders"
            label={t('tabelSettings.editLeaders')}
            icon="users"
            variant="soft"
            onPress={() => show('leaders', b.id)}
            full
          />
        )}
        <Button
          testID="tabel-open-blank"
          label={t('tabelSettings.blankTitle')}
          icon="doc"
          variant="soft"
          onPress={() => show('blank', b.id)}
          full
        />
      </View>
    );
  };

  const summary = (b: TabelBranch) => (
    <>
      <KeyValue
        label={t('tabelSettings.colApprover')}
        value={approverOf(b) ?? t('tabelSettings.approverDefault')}
        testID="tabel-approver"
      />
      <KeyValue label={t('tabelSettings.colSigners')} value={String(signersCountOf(b))} testID="tabel-signers" />
      <KeyValue
        label={t('tabelSettings.colStamp')}
        value={b.stamp_path ? t('tabelSettings.stampSet') : t('tabelSettings.stampNone')}
        testID="tabel-stamp"
      />
      <KeyValue
        label={t('tabelSettings.secTemplate')}
        value={tabelTemplateName(b) ?? t('tabelSettings.tplNoneShort')}
        testID="tabel-template"
      />
      <KeyValue label={t('tabelSettings.fieldPrefix')} value={b.bildirgi_number_prefix} />
    </>
  );

  const renderBody = () => {
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={260} />;
    if (scope.sole) {
      const b = scope.sole;
      return (
        <Card testID="tabel-sole">
          <View style={styles.soleHead}>
            <Text variant="heading" style={styles.flex}>
              {b.name || `#${b.id}`}
            </Text>
            <Text variant="caption" tone="subtle">
              {t('tabelSettings.scopeOwn')}
            </Text>
          </View>
          {summary(b)}
          <View style={styles.soleActions}>{actions(b, true)}</View>
        </Card>
      );
    }
    const rows = filterTabelBranches(scope.visible, search);
    return (
      <>
        <SearchField value={search} onChangeText={setSearch} placeholder={t('tabelSettings.search')} />
        <View style={styles.bar}>
          <Text variant="caption" tone="subtle" style={styles.flex} testID="tabel-count">
            {t('tabelSettings.total', { count: rows.length })}
          </Text>
          <Text variant="caption" tone="subtle">
            {scope.isGlobal ? t('tabelSettings.scopeAll') : t('tabelSettings.scopeOwn')}
          </Text>
        </View>
        <Card>
          {rows.length === 0 ? (
            search.trim() ? (
              <EmptyState
                title={t('tabelSettings.emptySearch')}
                action={{ label: t('common.clearFilters'), onPress: () => setSearch('') }}
              />
            ) : (
              <EmptyState title={t('tabelSettings.empty')} />
            )
          ) : (
            rows.map((b) => {
              const badges = (
                <View style={styles.badges}>
                  <Badge label={t('tabelSettings.signersCount', { count: signersCountOf(b) })} />
                  {b.stamp_path ? <Badge label={t('tabelSettings.colStamp')} tone="success" /> : null}
                </View>
              );
              return (
                <ListRow
                  key={b.id}
                  testID={`tabel-row-${b.id}`}
                  title={b.name || `#${b.id}`}
                  subtitle={approverOf(b) ?? t('tabelSettings.approverDefault')}
                  below={compact ? badges : undefined}
                  right={compact ? undefined : badges}
                  chevron
                  onPress={() => show('view', b.id)}
                />
              );
            })
          )}
        </Card>
      </>
    );
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={refreshing} onRefresh={() => void refresh()} testID="tabel-settings-screen">
        <PageHeader title={t('tabelSettings.title')} subtitle={t('tabelSettings.subtitle')} />
        <View style={styles.content}>
          {renderBody()}
          <Text variant="caption" tone="subtle">
            {t('tabelSettings.webOnly')}
          </Text>
        </View>
      </Screen>

      {open?.kind === 'view' && target && (
        <Sheet key={open.n} visible onClose={() => setOpen(null)} title={target.name || `#${target.id}`}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.sheetBody}>
            {summary(target)}
            {actions(target, true)}
          </ScrollView>
        </Sheet>
      )}
      {open?.kind === 'config' && target && <ConfigSheet key={open.n} branch={target} onClose={() => setOpen(null)} />}
      {open?.kind === 'leaders' && target && (
        <LeadersSheet key={open.n} branch={target} onClose={() => setOpen(null)} />
      )}
      {open?.kind === 'blank' && target && <BlankSheet key={open.n} branch={target} onClose={() => setOpen(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { gap: 8, marginTop: 4 },
  soleHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  soleActions: { marginTop: 8 },
  scroll: { flexShrink: 1 },
  sheetBody: { gap: 10, paddingBottom: 8 },
});
