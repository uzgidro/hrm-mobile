// The «my day» blocks of the home screen. Each brings its own data (the shared month of
// turnstile events is one request whatever the number of blocks), so a block that is off
// asks for nothing.
import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { menuBadgesQuery } from '@/lib/menuBadges';
import { leaveStatusGroup } from '@/utils/leaveStatus';
import { timeRange } from '@/utils/timeText';
import { homeAttendanceQuery, homeMyCalendarQuery, homeMyLeavesQuery } from '../../api/queries';
import { dayTimeline, weekSummary } from '../../utils/dayTimeline';
import { isExitEvent } from '../../utils/attendanceBoard';
import { DayTimelineCard } from './DayTimelineCard';
import { MyDayHero } from './MyDayHero';
import { MyStatsStrip } from './MyStatsStrip';
import { MyWeekCard } from './MyWeekCard';

function useMyEvents() {
  const employee = useAuthStore((s) => s.user?.employee);
  const now = dayjs();
  const today = now.format('YYYY-MM-DD');
  const monthStart = now.startOf('month').format('YYYY-MM-DD');
  // Oy boshidan (yoki 6 kun oldindan — hafta oy chegarasidan o'tsa) bugungacha.
  const sixAgo = now.subtract(6, 'day').format('YYYY-MM-DD');
  const from = monthStart < sixAgo ? monthStart : sixAgo;
  const data = useQuery(homeAttendanceQuery(employee?.id, `${from}_${today}`, from, today)).data;
  const events = useMemo(() => data ?? [], [data]);
  return { employee, events, today, monthStart };
}

function useMyTimeline() {
  const { employee, events, today } = useMyEvents();
  const timeline = useMemo(
    () => dayTimeline(events.filter((e) => dayjs(e.happen_time).format('YYYY-MM-DD') === today)),
    [events, today],
  );
  return { employee, timeline };
}

export function HeroBlock() {
  const { employee, timeline } = useMyTimeline();
  return (
    <MyDayHero
      name={employee?.legal_name ?? ''}
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
}

export function TimelineBlock() {
  return <DayTimelineCard timeline={useMyTimeline().timeline} />;
}

export function StatsBlock() {
  const { employee, events, monthStart } = useMyEvents();
  const myLeaves = useQuery(homeMyLeavesQuery(employee?.id)).data ?? [];
  const { data: badges } = useQuery(menuBadgesQuery());
  const daysPresent = useMemo(() => {
    const days = new Set<string>();
    for (const e of events) {
      const day = dayjs(e.happen_time).format('YYYY-MM-DD');
      if (!isExitEvent(e) && day >= monthStart) days.add(day);
    }
    return days.size;
  }, [events, monthStart]);
  return (
    <MyStatsStrip
      stats={{
        daysPresent,
        pendingRequests: myLeaves.filter((l) => leaveStatusGroup(l.status) === 'pending').length,
        docsWaiting: (badges?.orders ?? 0) + (badges?.letters ?? 0) + (badges?.documents ?? 0),
        unread: badges?.unread_notifications ?? 0,
      }}
    />
  );
}

export function WeekBlock() {
  const { employee, events, today } = useMyEvents();
  // «Oxirgi kunlar»: day status from MY tabel (approved leave → «Ruxsat», like Davomat).
  const weekFrom = dayjs(today).subtract(4, 'day').format('YYYY-MM-DD');
  const { data: calendar } = useQuery(homeMyCalendarQuery(employee?.id, weekFrom, today));
  const week = useMemo(
    () => weekSummary(events, today, employee?.working_hours_start, 5, calendar),
    [events, today, employee?.working_hours_start, calendar],
  );
  return <MyWeekCard days={week} />;
}
