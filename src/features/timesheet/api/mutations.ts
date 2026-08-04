import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { WORK_SCHEDULE_DAYS, WORK_SCHEDULE_DAY_DETAIL } from '@/api/urls';
import type { WorkScheduleDay } from '@/types';
import { timesheetKeys } from './queries';

export interface ScheduleDayPayload {
  employee_id: number;
  schedule_date: string;
  schedule_type?: string | null;
  working_hours_start?: string | null;
  working_hours_end?: string | null;
  is_day_off?: boolean;
}

// Assigning a GROUP duty day notifies the employee (push + in-app); clearing
// does not. Department-mode cells are silent — web parity: handleDeptCellClick
// posts without notify_navbatchilik, only handleGroupCellClick sets it.
const notifyCfg = (notify: boolean) => (notify ? { params: { notify_navbatchilik: true } } : undefined);

export function createScheduleDay(p: ScheduleDayPayload, notify = true): Promise<WorkScheduleDay> {
  return apiClient.post(WORK_SCHEDULE_DAYS, p, notifyCfg(notify)).then((r) => r.data);
}
export function updateScheduleDay(id: number, p: ScheduleDayPayload, notify = true): Promise<WorkScheduleDay> {
  return apiClient.put(WORK_SCHEDULE_DAY_DETAIL(id), p, notifyCfg(notify)).then((r) => r.data);
}
export function deleteScheduleDay(id: number): Promise<void> {
  return apiClient.delete(WORK_SCHEDULE_DAY_DETAIL(id)).then(() => undefined);
}

// One hook the grid uses: assign (POST new / PUT existing) or clear (DELETE),
// invalidating whichever roster query backs the grid — group OR department, the
// two navbatchilik modes — plus the personal schedule-day query, so the grid
// refreshes. `deptId` is set only in dept mode, `groupId` only in group mode.
export function useScheduleDayMutations(month: string, groupId?: number, deptId?: number) {
  const qc = useQueryClient();
  // Dept mode is the one without a group; it is also the silent one (see notifyCfg).
  const notify = !deptId;
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: timesheetKeys.groupScheduleDays(month, groupId) });
    qc.invalidateQueries({ queryKey: timesheetKeys.departmentScheduleDays(month, deptId) });
    qc.invalidateQueries({ queryKey: timesheetKeys.myScheduleDays(month) });
  };
  const m = useMutation({
    mutationFn: async (args: { payload?: ScheduleDayPayload; existingId?: number; del?: number }): Promise<WorkScheduleDay | void> => {
      if (args.del != null) return deleteScheduleDay(args.del);
      if (args.existingId != null) return updateScheduleDay(args.existingId, args.payload!, notify);
      return createScheduleDay(args.payload!, notify);
    },
    onSuccess: invalidate,
  });
  return {
    assign: (payload: ScheduleDayPayload, existingId?: number) =>
      m.mutateAsync({ payload, existingId }) as Promise<WorkScheduleDay>,
    clear: (id: number) => m.mutateAsync({ del: id }) as Promise<void>,
    isPending: m.isPending,
  };
}
