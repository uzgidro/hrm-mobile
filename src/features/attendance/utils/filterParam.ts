// Bosh sahifa tile'laridan kelgan `?filter=` → davomat ro'yxatining boshlang'ich
// holat filtri. Noma'lum / `all` — filtrsiz (ekran yiqilmaydi).
import type { AttendanceStatus } from '@/utils/attendanceRoster';

const ALLOWED: AttendanceStatus[] = ['present', 'late', 'absent', 'onLeave'];

export function filterFromParam(param: string | string[] | undefined): AttendanceStatus | null {
  const v = Array.isArray(param) ? param[0] : param;
  return (ALLOWED as string[]).includes(v ?? '') ? (v as AttendanceStatus) : null;
}
