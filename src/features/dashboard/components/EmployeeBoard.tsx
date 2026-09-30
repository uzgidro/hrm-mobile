// v3 xodim paneli (maket employee-light.png): Mening kunim hero → Bugungi yo'lim →
// statistik tile'lar → oxirgi kunlar → tug'ilgan kunlar. compact — bitta ustun;
// medium — 2 ustun; expanded — 3 ustunli bento.
import React, { useMemo } from 'react';
import { View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { menuBadgesQuery } from '@/lib/menuBadges';
import { resolveEmployeeBranchId } from '@/utils/branch';
import { leaveStatusGroup } from '@/utils/leaveStatus';
import { timeRange } from '@/utils/timeText';
import { Bento } from '@/ui';
import { useBreakpoint } from '@/utils/responsive';
import { homeAttendanceQuery, homeMyLeavesQuery } from '../api/queries';
import { dayTimeline, weekSummary } from '../utils/dayTimeline';
import { isExitEvent } from '../utils/attendanceBoard';
import { MyDayHero } from './employee/MyDayHero';
import { DayTimelineCard } from './employee/DayTimelineCard';
import { MyStatsStrip } from './employee/MyStatsStrip';
import { MyWeekCard } from './employee/MyWeekCard';
import { BirthdaysCard } from './shared/BirthdaysCard';

export function EmployeeBoard() {
  const user = useAuthStore((s) => s.user);
  const employee = user?.employee;
  const branchId = resolveEmployeeBranchId(employee) ?? undefined;
  const { bentoColumns } = useBreakpoint();

  const now = dayjs();
  const today = now.format('YYYY-MM-DD');
  const monthStart = now.startOf('month');
  // Oy boshidan (yoki 6 kun oldindan — hafta oy chegarasidan o'tsa) bugungacha.
  const from = (monthStart.isBefore(now.subtract(6, 'day')) ? monthStart : now.subtract(6, 'day')).format('YYYY-MM-DD');
  const events = useQuery(homeAttendanceQuery(employee?.id, `${from}_${today}`, from, today)).data ?? [];
  const myLeaves = useQuery(homeMyLeavesQuery(employee?.id)).data ?? [];
  const { data: badges } = useQuery(menuBadgesQuery());

  const todayEvents = useMemo(() => events.filter((e) => dayjs(e.happen_time).format('YYYY-MM-DD') === today), [events, today]);
  const timeline = useMemo(() => dayTimeline(todayEvents), [todayEvents]);
  const week = useMemo(() => weekSummary(events, today, employee?.working_hours_start, 5), [events, today, employee?.working_hours_start]);
  const daysPresent = useMemo(() => {
    const days = new Set<string>();
    for (const e of events) {
      const d = dayjs(e.happen_time);
      if (!isExitEvent(e) && !d.isBefore(monthStart)) days.add(d.format('YYYY-MM-DD'));
    }
    return days.size;
  }, [events, monthStart]);

  const stats = {
    daysPresent,
    pendingRequests: myLeaves.filter((l) => leaveStatusGroup(l.status) === 'pending').length,
    docsWaiting: (badges?.orders ?? 0) + (badges?.letters ?? 0) + (badges?.documents ?? 0),
    unread: badges?.unread_notifications ?? 0,
  };

  const name = employee?.legal_name ?? '';
  const hero = (
    <MyDayHero
      name={name}
      position={employee?.job_position?.name}
      photo={employee?.photo_path}
      scheduleRange={
        employee?.working_hours_start && employee?.working_hours_end
          ? timeRange(employee.working_hours_start, employee.working_hours_end)
          : null
      }
      timeline={timeline}
    />
  );

  return (
    <View testID="board-employee" style={{ gap: 12 }}>
      <Bento>
        <Bento.Item span={1}>{hero}</Bento.Item>
        <Bento.Item span={bentoColumns >= 3 ? 2 : 1}>
          <View style={{ gap: 12 }}>
            <DayTimelineCard timeline={timeline} />
            <MyStatsStrip stats={stats} />
          </View>
        </Bento.Item>
      </Bento>
      <Bento>
        <Bento.Item>
          <MyWeekCard days={week} />
        </Bento.Item>
        <Bento.Item>
          <BirthdaysCard branchId={branchId} />
        </Bento.Item>
      </Bento>
    </View>
  );
}
