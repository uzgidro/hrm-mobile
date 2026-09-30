// Rahbar panelining bugungi ma'lumoti: day-board + kategoriyalar → qatorlar va
// hisoblagichlar (v2 useDashboard). Yupqa hook — mantiq attendanceBoard.ts da.
import { useMemo } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { boardCategoriesQuery, boardDayQuery } from '../../api/queries';
import { buildAttendanceRows, countByStatus, hydrateDayBoard } from '../../utils/attendanceBoard';

export function useBoardDay(branchId: number | undefined) {
  const day = dayjs().format('YYYY-MM-DD');
  const board = useQuery(boardDayQuery(branchId, day));
  const categories = useQuery(boardCategoriesQuery(branchId));
  const hydrated = useMemo(() => hydrateDayBoard(board.data), [board.data]);
  const rows = useMemo(() => buildAttendanceRows(hydrated.personEvents, categories.data), [hydrated, categories.data]);
  const counts = useMemo(() => countByStatus(rows), [rows]);
  return {
    hydrated,
    rows,
    counts,
    isPending: board.isPending || categories.isPending,
    isError: board.isError && categories.isError,
    refetch: () => Promise.all([board.refetch(), categories.refetch()]),
  };
}

export type BoardDay = ReturnType<typeof useBoardDay>;

export const pct = (v: number, of: number) => (of ? Math.round((v / of) * 100) : 0);
