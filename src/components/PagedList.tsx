// The list body for every server-paged screen (letters, orders, leaves,
// employees, visitors, news, support ...). Owns the four states a paged list
// has — first load, first-load ERROR (previously most screens rendered
// "nothing here" on a 500 because they never read `isError`), empty, and
// "loading the next page" — plus pull-to-refresh and the "N of TOTAL" line.
// Screens keep their own header/tabs/search above it; pass those through
// `header` when they should scroll with the rows.
import { useMemo, type ReactElement, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, type FlatListProps, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { flattenPages, pagesTotal, type PageOut } from '@/lib/pagedList';
import { getApiErrorMessage } from '@/api/errors';
import { EmptyState, ErrorState, LoadingView } from './StateViews';
import type { IconName } from './Icon';

type Query<T> = UseInfiniteQueryResult<InfiniteData<PageOut<T>, unknown>, Error>;

interface Props<T> extends Pick<FlatListProps<T>, 'numColumns' | 'columnWrapperStyle' | 'contentContainerStyle' | 'ItemSeparatorComponent'> {
  query: Query<T>;
  renderItem: (item: T) => ReactElement | null;
  keyExtractor: (item: T) => string;
  emptyTitle: string;
  emptyMessage?: string;
  emptyIcon?: IconName;
  header?: ReactNode;
  /** Hide the "N / total" caption (e.g. inside a split master pane). */
  hideCount?: boolean;
  /** Called with the flattened rows whenever they change (split-view selection). */
  onRows?: (rows: T[]) => void;
}

// Memoised on `query.data` so screens can put `rows` in effect deps
// (split-view selection) without re-running every render.
export function usePagedRows<T>(query: Query<T>): { rows: T[]; total: number | undefined } {
  const pages = query.data?.pages;
  return useMemo(() => ({ rows: flattenPages(pages), total: pagesTotal(pages) }), [pages]);
}

export function PagedList<T>({
  query, renderItem, keyExtractor, emptyTitle, emptyMessage, emptyIcon = 'inbox', header, hideCount,
  numColumns, columnWrapperStyle, contentContainerStyle, ItemSeparatorComponent,
}: Props<T>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { rows, total } = usePagedRows(query);

  if (query.isLoading) return <LoadingView />;
  if (query.isError && rows.length === 0) {
    return (
      <ErrorState
        message={getApiErrorMessage(query.error, t('errors.refreshFailed'))}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <FlatList
      data={rows}
      key={numColumns ?? 1}
      numColumns={numColumns}
      columnWrapperStyle={columnWrapperStyle}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      ItemSeparatorComponent={ItemSeparatorComponent}
      contentContainerStyle={[styles.content, rows.length === 0 && styles.contentEmpty, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
          tintColor={colors.primaryLight}
        />
      }
      ListHeaderComponent={
        <>
          {header}
          {!hideCount && total != null && rows.length > 0 && (
            <Text style={styles.count} accessibilityRole="text">
              {t('common.listCount', { shown: rows.length, total })}
            </Text>
          )}
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />
        </View>
      }
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <ActivityIndicator style={styles.footer} color={colors.primaryLight} />
        ) : (
          <View style={styles.footerPad} />
        )
      }
    />
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 4 },
    contentEmpty: { flexGrow: 1 },
    count: { fontSize: 12, color: c.textMuted, paddingBottom: 8, paddingHorizontal: 2 },
    emptyWrap: { flex: 1, paddingTop: 40 },
    footer: { paddingVertical: 16 },
    footerPad: { height: 24 },
  });
