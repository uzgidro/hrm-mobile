// v3 Davomat tabi: o'z davomati (timesheet) ruxsati bo'lsa — Tabel, aks holda
// tashkilot davomati. To'liq qayta dizayn — W2.
import MyTimesheetScreen from '@/features/timesheet/screens/MyTimesheetScreen';
import AttendanceDetailScreen from '@/features/attendance/screens/AttendanceDetailScreen';
import { useAuthStore } from '@/store/authStore';
import { useNavSettings } from '@/lib/navSettings';
import { canAccessPage } from '@/utils/roles';
import { TabRoot } from '@/components/TabRoot';

export default function AttendanceTab() {
  const user = useAuthStore((s) => s.user);
  useNavSettings();
  return <TabRoot>{canAccessPage(user, 'timesheet') ? <MyTimesheetScreen /> : <AttendanceDetailScreen />}</TabRoot>;
}
