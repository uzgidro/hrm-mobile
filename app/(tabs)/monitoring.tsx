// v3 Monitoring tabi: monitoring moduli (v2 MonitoringPage porti); moduli yo'q, lekin
// tashkilot davomatiga ruxsati bor — davomat; aks holda «tez orada».
import { useTranslation } from 'react-i18next';
import AttendanceDetailScreen from '@/features/attendance/screens/AttendanceDetailScreen';
import MonitoringScreen from '@/features/monitoring/screens/MonitoringScreen';
import { useAuthStore } from '@/store/authStore';
import { useNavSettings } from '@/lib/navSettings';
import { canAccessPage } from '@/utils/roles';
import { EmptyState, Screen } from '@/ui';

export default function MonitoringTab() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  useNavSettings();
  if (canAccessPage(user, 'monitoring')) return <MonitoringScreen />;
  if (canAccessPage(user, 'attendance')) return <AttendanceDetailScreen />;
  return (
    <Screen scroll={false}>
      <EmptyState title={t('tabs.monitoringSoon')} pose="idle" />
    </Screen>
  );
}
