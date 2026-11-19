// v3 Davomat tabi. O'z tabeli bo'lgan rol (xodim, buxgalter, rahbariyat…) — «Mening tabelim ·
// Jamoa» segmentlari; tabeli yo'q rol (kadr, monitoring…) — to'g'ridan filial jamoasi.
// Route fayli kompozitsiya qiladi — feature'lar bir-birini import qilmaydi.
import MyTimesheetScreen from '@/features/timesheet/screens/MyTimesheetScreen';
import AttendanceDetailScreen from '@/features/attendance/screens/AttendanceDetailScreen';
import AttendanceTabScreen from '@/features/shell/screens/AttendanceTabScreen';
import { useAuthStore } from '@/store/authStore';
import { useNavSettings } from '@/lib/navSettings';
import { canAccessPage } from '@/utils/roles';
import { TabRoot } from '@/components/TabRoot';

export default function AttendanceTab() {
  const user = useAuthStore((s) => s.user);
  useNavSettings();
  if (!canAccessPage(user, 'timesheet')) {
    return (
      <TabRoot>
        <AttendanceDetailScreen />
      </TabRoot>
    );
  }
  return (
    <TabRoot>
      <AttendanceTabScreen
        renderSegment={(seg) => (seg === 'team' ? <AttendanceDetailScreen embedded /> : <MyTimesheetScreen embedded />)}
      />
    </TabRoot>
  );
}
