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

// Assigning a duty day notifies the employee (push + in-app). Clearing does not.
const NOTIFY = { params: { notify_navbatchilik: true } };

export function createScheduleDay(p: ScheduleDayPayload): Promise<WorkScheduleDay> {
  return apiClient.post(WORK_SCHEDULE_DAYS, p, NOTIFY).then((r) => r.data);
}
export function updateScheduleDay(id: number, p: ScheduleDayPayload): Promise<WorkScheduleDay> {
  return apiClient.put(WORK_SCHEDULE_DAY_DETAIL(id), p, NOTIFY).then((r) => r.data);
}
export function deleteScheduleDay(id: number): Promise<void> {
  return apiClient.delete(WORK_SCHEDULE_DAY_DETAIL(id)).then(() => undefined);
}

// One hook the grid uses: assign (POST new / PUT existing) or clear (DELETE),
// invalidating the group + personal schedule-day queries so the grid refreshes.
export function useScheduleDayMutations(month: string, groupId?: number) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: timesheetKeys.groupScheduleDays(month, groupId) });
    qc.invalidateQueries({ queryKey: timesheetKeys.myScheduleDays(month) });
  };
  const m = useMutation({
    mutationFn: async (args: { payload?: ScheduleDayPayload; existingId?: number; del?: number }): Promise<WorkScheduleDay | void> => {
      if (args.del != null) return deleteScheduleDay(args.del);
      if (args.existingId != null) return updateScheduleDay(args.existingId, args.payload!);
      return createScheduleDay(args.payload!);
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
