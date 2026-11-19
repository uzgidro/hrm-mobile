// Bosh sahifadagi «Ruxsat so'rovlari» kartasi (2026-10-07): qo'shimcha roli bor xodim (kadr,
// rahbar, bo'linma boshlig'i, o'rinbosar, buxgalteriya, kuzatuvchi) rahbar panelini ko'radi —
// u yerda o'zi uchun ruxsat so'rash ham, tasdig'ini kutayotgan so'rovlar ham yo'q edi, faqat menyu
// orqali. Karta: «Ruxsat so'rash», tasdig'ingizni kutayotganlar soni (menyu raqami bilan bir
// manba — server `leaves`) va birinchi 3 tasi (serverda `action_first`, mijozda `canActOnLeave`).
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router, type Href } from 'expo-router';
import dayjs from 'dayjs';
import { apiClient } from '@/api/client';
import { unwrapList } from '@/api/response';
import { WORK_LEAVES } from '@/api/urls';
import { useAuthStore } from '@/store/authStore';
import { menuBadgesQuery } from '@/lib/menuBadges';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { Button, Card, ListRow, Text } from '@/ui';
import type { WorkLeave } from '@/types';
import { leaveTypeLabel } from './LeaveTypeSheet';
import { canActOnLeave } from '../utils';

const SHOWN = 3;

export function homeAwaitingLeavesQuery(employeeId: number | undefined) {
  return {
    // `work-leaves` ildizi — imzolash/rad etish invalidatsiyasi kartani ham yangilaydi.
    queryKey: ['work-leaves', 'home', 'awaiting', employeeId ?? null] as const,
    queryFn: () =>
      apiClient
        .get(WORK_LEAVES, { params: { status: 'pending', action_first: true, slim: true, page: 1, size: 20 } })
        .then((r) => unwrapList<WorkLeave>(r.data)),
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  };
}

function range(l: WorkLeave): string {
  const s = dayjs(l.start_date);
  const e = dayjs(l.end_date);
  return s.isSame(e, 'day') ? `${s.format('DD.MM')} ${s.format('HH:mm')}–${e.format('HH:mm')}` : `${s.format('DD.MM')} – ${e.format('DD.MM')}`;
}

export function HomeLeavesCard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const employeeId = user?.employee?.id;
  const { data: badges } = useQuery(menuBadgesQuery());
  const list = useQuery(homeAwaitingLeavesQuery(employeeId));
  const awaiting = useMemo(
    () => (list.data ?? []).filter((l) => canActOnLeave(l, user).canSign),
    [list.data, user],
  );
  if (!employeeId) return null;
  const count = badges?.leaves ?? awaiting.length;

  return (
    <Card
      title={t('leaves.homeTitle')}
      icon="calendar"
      tint="orange"
      testID="home-leaves-card"
      action={{ label: t('leaves.homeAll'), onPress: () => router.push('/work-leaves' as Href) }}
    >
      <Text variant="caption" tone={count > 0 ? 'brand' : 'subtle'} testID="home-leaves-count">
        {count > 0 ? t('leaves.homeAwaiting', { count }) : t('leaves.homeNoneAwaiting')}
      </Text>
      {awaiting.slice(0, SHOWN).map((l) => (
        <ListRow
          key={l.id}
          testID={`home-leave-${l.id}`}
          title={l.employee?.legal_name ?? '—'}
          subtitle={`${l.type ? leaveTypeLabel(t, l.type) : t('leaves.typeFallback')} · ${range(l)}`}
          left={l.employee ? <EmployeeAvatar emp={l.employee} size={36} /> : undefined}
          chevron
          onPress={() => router.push({ pathname: '/leave-detail', params: { id: l.id } })}
        />
      ))}
      <View style={styles.actions}>
        <Button
          testID="home-leave-create"
          label={t('leaves.homeCreate')}
          icon="plus"
          full
          onPress={() => router.push('/create-leave' as Href)}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({ actions: { marginTop: 8 } });
