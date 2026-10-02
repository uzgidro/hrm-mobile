// Ijro intizomi — web v2 `pages/IjroPage.tsx` holat va muddat mantig'i porti.
// Sanalar 'YYYY-MM-DD' qatorlari — leksikografik solishtirish v2 bilan bir xil.
import dayjs from 'dayjs';

export type IjroTask = {
  id: number;
  task_index?: string | null;
  description?: string | null;
  employee_id?: number | null;
  deadline_date?: string | null;
  task_completed?: string | null;
  employee?: { id: number; legal_name?: string | null; photo_path?: string | null; photo_thumb_path?: string | null } | null;
};

export type IjroStatus = 'open' | 'late' | 'late_done' | 'done';
export const IJRO_STATUSES: IjroStatus[] = ['open', 'late', 'late_done', 'done'];

export function statusOf(t: Pick<IjroTask, 'deadline_date' | 'task_completed'>, today: string): IjroStatus {
  if (t.task_completed) return t.task_completed > (t.deadline_date ?? '') ? 'late_done' : 'done';
  return (t.deadline_date ?? '') < today ? 'late' : 'open';
}

/** Kechikish kunlari: yopilgan bo'lsa — yopilgan kungacha, aks holda bugungacha. */
export function delayDays(t: Pick<IjroTask, 'deadline_date' | 'task_completed'>, today: string): number {
  if (!t.deadline_date) return 0;
  const end = dayjs(t.task_completed || today);
  return Math.max(0, end.startOf('day').diff(dayjs(t.deadline_date).startOf('day'), 'day'));
}

export function daysLeft(t: Pick<IjroTask, 'deadline_date'>, today: string): number {
  return dayjs(t.deadline_date).startOf('day').diff(dayjs(today).startOf('day'), 'day');
}

export type TaskForm = { index: string; description: string; employeeId: number | null; deadline: string; done: string };

export function validateTask(f: TaskForm): 'indexRequired' | 'employeeRequired' | 'deadlineRequired' | null {
  if (!f.index.trim()) return 'indexRequired';
  if (!f.employeeId) return 'employeeRequired';
  if (!f.deadline) return 'deadlineRequired';
  return null;
}

export function buildTaskBody(f: TaskForm) {
  return {
    task_index: f.index.trim(),
    description: f.description.trim() || null,
    employee_id: f.employeeId,
    deadline_date: f.deadline,
    task_completed: f.done || null,
  };
}
