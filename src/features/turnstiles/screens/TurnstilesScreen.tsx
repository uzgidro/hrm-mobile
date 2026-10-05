// v3 Turniketlar — web v2 `TurnstilesPage` porti: davomat aynan shu qurilmalardan yig'iladi. Server
// qidiruvi (nomi, IP, kod) va sahifalash (50 tadan), «N / M onlayn» (bitta sahifa bo'lsa — hammasi
// bo'yicha, aks holda joriy sahifa bo'yicha va shunday deb yoziladi), qator: holat nuqtasi, nom, IP ·
// manzillar, holat nishoni (ulanish turi — faqat keng ekranda, v2 kabi); varaq: ma'lumot / eshiklar /
// ISAPI terminali; qo'shish va tahrir, o'chirish — tasdiq bilan; ISAPI terminalini ro'yxatga olish;
// HikCentral sinxronizatsiyasi (faqat global admin). Huquq — v2 `RequireRole(canAccessSystemAdmin)`.
// HikCentral MONITORINGI (onlayn/oflayn statistikasi, xodimlarni yuklash) — alohida `terminals` ekrani.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useTheme } from '@/theme/ThemeProvider';
import { canMonitorTerminals } from '@/utils/roles';
import { useBreakpoint } from '@/utils/responsive';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  PageHeader,
  Pager,
  Screen,
  SearchField,
  Skeleton,
  Text,
} from '@/ui';
import { turnstilesQuery } from '../api/queries';
import { HikSyncSheet } from '../components/HikSyncSheet';
import { IsapiRegisterSheet } from '../components/IsapiRegisterSheet';
import { TurnstileFormSheet } from '../components/TurnstileFormSheet';
import { TurnstileSheet } from '../components/TurnstileSheet';
import { isOnline, onlineCount, turnstileName, turnstileSubtitle, type TurnstileRow } from '../utils/turnstiles';

type Open =
  | { kind: 'view'; row: TurnstileRow; n: number }
  | { kind: 'form'; row: TurnstileRow | null; n: number }
  | { kind: 'isapi'; n: number }
  | { kind: 'sync'; n: number }
  | null;

export default function TurnstilesScreen() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const user = useAuthStore((s) => s.user);
  const allowed = canMonitorTerminals(user);
  const compact = useBreakpoint().sizeClass === 'compact';
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);
  const [open, setOpen] = useState<Open>(null);
  // Pull-to-refresh spinneri faqat foydalanuvchi tortganda: `isRefetching` qidiruv/invalidatsiyada ham
  // yonib, ekran tepasida keraksiz aylanardi.
  const [refreshing, setRefreshing] = useState(false);
  // Sahifa qidiruvga bog'liq: qidiruv o'zgarsa — yana 1-sahifa.
  const [pg, setPg] = useState({ key: debounced, n: 1 });
  const page = pg.key === debounced ? pg.n : 1;
  const setPage = (n: number) => setPg({ key: debounced, n });
  const list = useQuery({ ...turnstilesQuery(debounced, page), enabled: allowed });
  // Sahifa serverdagi sahifalar sonidan oshmasin: oxirgi sahifaning yagona turniketi o'chirilsa ro'yxat
  // bo'sh qolib, Pager yashirinardi — oxirgi mavjud sahifaga qaytamiz (render paytidagi tuzatish).
  const serverPages = list.isSuccess && !list.isPlaceholderData ? Math.max(1, list.data.pages) : null;
  if (serverPages != null && pg.key === debounced && pg.n > serverPages) setPg({ key: debounced, n: serverPages });

  const header = <PageHeader title={t('turnstiles.title')} subtitle={t('turnstiles.subtitle')} />;
  if (!allowed) {
    return (
      <Screen>
        {header}
        <Card>
          <EmptyState title={t('turnstiles.noAccess')} message={t('turnstiles.noAccessHint')} pose="sad" />
        </Card>
      </Screen>
    );
  }

  const rows = list.data?.items ?? [];
  const pages = list.data?.pages ?? 1;
  const refresh = async () => {
    setRefreshing(true);
    try {
      await list.refetch();
    } finally {
      setRefreshing(false);
    }
  };
  const renderRows = () => {
    if (list.isError && !list.data) return <ErrorState onRetry={() => list.refetch()} />;
    if (list.isPending) return <Skeleton height={260} />;
    if (!rows.length) {
      return debounced.trim() ? (
        <EmptyState
          title={t('common.noMatch')}
          message={t('common.noMatchHint')}
          action={{ label: t('common.clearFilters'), onPress: () => setSearch('') }}
        />
      ) : (
        <EmptyState title={t('turnstiles.empty')} message={t('turnstiles.emptyHint')} />
      );
    }
    return rows.map((x) => {
      const online = isOnline(x.status);
      const badges = (
        <View style={styles.badges}>
          {!!x.treaty_type && <Badge testID={`turnstile-type-${x.id}`} label={x.treaty_type} />}
          <Badge
            testID={`turnstile-status-${x.id}`}
            label={online ? t('turnstiles.online') : t('turnstiles.offline')}
            tone={online ? 'success' : 'neutral'}
          />
        </View>
      );
      return (
        <ListRow
          key={x.id}
          testID={`turnstile-row-${x.id}`}
          // Telefonda onlayn holati bitta — nishon (matnli); nuqta faqat keng ekranda (u yerda nishon o'ngda).
          left={compact ? undefined : <View style={[styles.dot, { backgroundColor: online ? c.successMark : c.border }]} />}
          title={turnstileName(x)}
          subtitle={turnstileSubtitle(x)}
          below={compact ? <View style={styles.below}>{badges}</View> : undefined}
          right={compact ? undefined : badges}
          onPress={() => setOpen({ kind: 'view', row: x, n: Date.now() })}
        />
      );
    });
  };

  return (
    <View style={styles.root}>
      <Screen refreshing={refreshing} onRefresh={() => void refresh()} testID="turnstiles-screen">
        {header}
        <View style={styles.controls}>
          <SearchField value={search} onChangeText={setSearch} placeholder={t('turnstiles.searchPlaceholder')} />
          <View style={styles.bar}>
            <Text variant="caption" tone="subtle" style={styles.flex} testID="turnstiles-online">
              {!list.data
                ? ''
                : pages > 1
                  ? t('turnstiles.onlineOfPage', {
                      online: onlineCount(rows),
                      shown: rows.length,
                      total: list.data.total,
                    })
                  : t('turnstiles.onlineOf', { online: onlineCount(rows), total: rows.length })}
            </Text>
            <Button
              testID="turnstile-sync"
              label={t('turnstiles.syncTitle')}
              icon="refresh"
              size="sm"
              variant="link"
              onPress={() => setOpen({ kind: 'sync', n: Date.now() })}
            />
            <Button
              testID="isapi-new"
              label={t('turnstiles.isapiAdd')}
              size="sm"
              variant="link"
              onPress={() => setOpen({ kind: 'isapi', n: Date.now() })}
            />
            <Button
              testID="turnstile-new"
              label={t('turnstiles.add')}
              icon="plus"
              size="sm"
              onPress={() => setOpen({ kind: 'form', row: null, n: Date.now() })}
            />
          </View>
        </View>
        <Card>
          {renderRows()}
          <Pager page={page} pages={pages} onPage={setPage} />
        </Card>
      </Screen>
      {open?.kind === 'view' && (
        <TurnstileSheet
          key={open.n}
          row={open.row}
          onEdit={() => setOpen({ kind: 'form', row: open.row, n: Date.now() })}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.kind === 'form' && <TurnstileFormSheet key={open.n} row={open.row} onClose={() => setOpen(null)} />}
      {open?.kind === 'isapi' && <IsapiRegisterSheet key={open.n} onClose={() => setOpen(null)} />}
      {open?.kind === 'sync' && <HikSyncSheet key={open.n} onClose={() => setOpen(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: { gap: 10, marginBottom: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 100 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  below: { marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
