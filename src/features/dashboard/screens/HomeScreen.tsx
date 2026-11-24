// v3 bosh sahifa («Tomchi × v2», spec §7). Qaysi panel — `homeBoardFor` (web v2
// DashboardPage porti): xodim / apparat → HomeBlocks, kiosk akkauntlar → o'z tabiga
// (post / monitoring). Pull-to-refresh barcha panel so'rovlarini yangilaydi.
// Blocks and their order are the person's own (2026-11-24, `useHomeBoard`).
import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Redirect, router, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { homeBoardFor } from '@/utils/homeBoard';
import { MENU_BADGES_KEY } from '@/lib/menuBadges';
import { LoadingView, Screen } from '@/ui';
import { dashboardKeys, prefetchHomeData } from '../api/queries';
import { HomeHeader } from '../components/HomeHeader';
import { HomeBlocks } from '../components/HomeBlocks';
import { homeKeys, useHomeBoard } from '../board/useHomeBoard';
import { useActiveBranchId } from '@/lib/useActiveBranch';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const activeBranchId = useActiveBranchId();
  const queryClient = useQueryClient();
  const board = homeBoardFor(user);
  const branchId = activeBranchId ?? undefined;
  const kind = board === 'employee' || board === 'leader' ? board : null;
  const home = useHomeBoard(kind);
  const ready = !!kind && home.ready;
  const birthdays = home.visible.includes('birthdays');
  const [refreshing, setRefreshing] = useState(false);

  // Keyingi ekranlar (davomat, jamoa, tug'ilgan kunlar) keshini isitish.
  useEffect(() => {
    if (ready) prefetchHomeData(queryClient, branchId, dayjs().format('YYYY-MM-DD'), { birthdays });
  }, [queryClient, branchId, ready, birthdays]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all(
        [dashboardKeys.all, ['attendance'], ['birthdays'], ['work-leaves'], ['mobile-checkins'], MENU_BADGES_KEY, homeKeys.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [...queryKey] }),
        ),
      );
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  // Bosh sahifasi boshqa joyda bo'lgan rollar (v2 DashboardPage bilan bir xil yo'naltirish).
  const elsewhere: Partial<Record<typeof board, string>> = {
    post: '/post',
    monitoring: '/monitoring',
    chancellery: '/documents?seg=orders',
    // v2 /filiallar — Asosiy tab admin uchun Filiallar ekranini o'zi ko'rsatadi (app/(tabs)/index.tsx);
    // bu yerga faqat Filiallar moduli o'chirilganda keladi.
    admin: '/modules',
    guest: '/registratsiya-holati', // v2 RegistrationStatusPage
  };
  const target = elsewhere[board];
  if (target) return <Redirect href={target as Href} />;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} testID="home-screen">
      <HomeHeader />
      {!kind || !home.localRead ? null : home.ready ? (
        <HomeBlocks board={kind} blocks={home.visible} onCustomise={() => router.push('/home-customise' as Href)} />
      ) : (
        <LoadingView />
      )}
    </Screen>
  );
}
