// Small building blocks shared by the sanatorium screens.
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import type { UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AccessDenied } from '@/components/AccessDenied';
import { DatePickerModal } from '@/components/DatePicker';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { formatUzPhone, telUrl } from '@/utils/phone';
import { Button, ErrorState, IconButton, LoadingView, Text } from '@/ui';
import type { SanRole } from '../types';
import { addDays, fmtDate, hasSanRole, todayIso } from '../utils/sanatorium';

/** True when the signed-in user holds one of `roles` (any sanatorium role when none are given). */
export function useSanAccess(...roles: SanRole[]): boolean {
  const user = useAuthStore((s) => s.user);
  return roles.length ? hasSanRole(user, ...roles) : (user?.sanatorium_roles?.length ?? 0) > 0;
}

export function Denied() {
  const { t } = useTranslation();
  return <AccessDenied title={t('sanatorium.title')} />;
}

/** Loading / error shell around a query; renders `children(data)` once data is there. */
export function QueryBlock<T>({
  query,
  children,
  rows = 3,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => React.ReactNode;
  rows?: number;
}) {
  if (query.isPending) return <LoadingView rows={rows} />;
  if (query.isError || query.data === undefined) return <ErrorState onRetry={() => void query.refetch()} />;
  return <>{children(query.data)}</>;
}

/** Loading / error shell for a paged list: flattens the pages and shows «load more» until `total`. */
export function PagedBlock<T>({
  query,
  children,
}: {
  query: UseInfiniteQueryResult<{ pages: { items: T[]; total: number }[] }, Error>;
  children: (items: T[], total: number) => React.ReactNode;
}) {
  const { t } = useTranslation();
  if (query.isPending) return <LoadingView rows={3} />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const items = query.data.pages.flatMap((p) => p.items);
  const total = query.data.pages[query.data.pages.length - 1]?.total ?? items.length;
  return (
    <>
      {children(items, total)}
      {query.hasNextPage && (
        <Button testID="load-more" label={`${t('sanatorium.showMore')} (${items.length}/${total})`} variant="soft" full loading={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} />
      )}
    </>
  );
}

/** Guest phone: tap to dial. Renders nothing when the number is unknown. */
export function PhoneLink({ phone }: { phone?: string | null }) {
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const url = telUrl(phone);
  if (!url) return null;
  return (
    <Pressable
      onPress={() => void Linking.openURL(url).catch(() => {})}
      accessibilityRole="link"
      accessibilityLabel={`${t('sanatorium.call')} ${formatUzPhone(phone)}`}
      hitSlop={8}
      style={styles.phone}
      testID="san-phone"
    >
      <Icon name="phone" size={14} color={c.drop} />
      <Text variant="label" tone="link">
        {formatUzPhone(phone)}
      </Text>
    </Pressable>
  );
}

/** «‹ 14.11.2026 ›» day switcher; the label opens the date picker. */
export function DayBar({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.dayBar}>
      <IconButton icon="chevronLeft" tone="soft" accessibilityLabel={t('sanatorium.prevDay')} onPress={() => onChange(addDays(value, -1))} />
      <Pressable onPress={() => setOpen(true)} style={styles.dayLabel} accessibilityRole="button" testID="san-day">
        <Icon name="calendar" size={16} color={c.fgMuted} />
        <Text variant="heading">{value === todayIso() ? `${t('sanatorium.today')}, ${fmtDate(value)}` : fmtDate(value)}</Text>
      </Pressable>
      <IconButton icon="chevronRight" tone="soft" accessibilityLabel={t('sanatorium.nextDay')} onPress={() => onChange(addDays(value, 1))} />
      <DatePickerModal visible={open} value={value} title={t('sanatorium.pickDate')} onConfirm={onChange} onClose={() => setOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  phone: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, alignSelf: 'flex-start' },
  dayBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dayLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 8 },
});
