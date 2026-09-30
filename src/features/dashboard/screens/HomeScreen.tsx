// v3 bosh sahifa («Tomchi × v2», spec §7). Qaysi panel — `homeBoardFor` (web v2
// DashboardPage porti): xodim → EmployeeBoard, apparat → LeaderBoard, kiosk
// akkauntlar → o'z tabiga (post / monitoring). Pull-to-refresh barcha panel
// so'rovlarini yangilaydi.
import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Redirect, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { homeBoardFor } from '@/utils/homeBoard';
import { MENU_BADGES_KEY } from '@/lib/menuBadges';
import { Screen } from '@/ui';
import { dashboardKeys, prefetchHomeData } from '../api/queries';
import { HomeHeader } from '../components/HomeHeader';
import { EmployeeBoard } from '../components/EmployeeBoard';
import { LeaderBoard } from '../components/LeaderBoard';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const board = homeBoardFor(user);
  const branchId = resolveEmployeeBranchId(user?.employee) ?? undefined;
  const [refreshing, setRefreshing] = useState(false);

  // Keyingi ekranlar (davomat, jamoa, tug'ilgan kunlar) keshini isitish.
  useEffect(() => {
    if (board === 'employee' || board === 'leader') {
      prefetchHomeData(queryClient, branchId, dayjs().format('YYYY-MM-DD'));
    }
  }, [queryClient, branchId, board]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all(
        [dashboardKeys.all, ['attendance'], ['birthdays'], ['work-leaves'], MENU_BADGES_KEY].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [...queryKey] }),
        ),
      );
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  if (board === 'post') return <Redirect href={'/post' as Href} />;
  if (board === 'monitoring') return <Redirect href={'/monitoring' as Href} />;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} testID="home-screen">
      <HomeHeader />
      {board === 'leader' ? <LeaderBoard /> : <EmployeeBoard />}
    </Screen>
  );
}
