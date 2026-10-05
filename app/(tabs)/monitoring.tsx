// v3 Monitoring tabi: monitoring moduli (v2 MonitoringPage porti); moduli yo'q, lekin
// tashkilot davomatiga ruxsati bor — davomat; aks holda «tez orada».
import { useTranslation } from 'react-i18next';
import AttendanceDetailScreen from '@/features/attendance/screens/AttendanceDetailScreen';
import MonitoringScreen from '@/features/monitoring/screens/MonitoringScreen';
import { useAuthStore } from '@/store/authStore';
import { useNavSettings } from '@/lib/navSettings';
import { canAccessPage } from '@/utils/roles';
import { EmptyState, Screen } from '@/ui';
import { TabRoot } from '@/components/TabRoot';

export default function MonitoringTab() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  useNavSettings();
  return (
    <TabRoot>
      {canAccessPage(user, 'monitoring') ? (
        <MonitoringScreen />
      ) : canAccessPage(user, 'attendance') ? (
        <AttendanceDetailScreen />
      ) : (
        <Screen scroll={false}>
          <EmptyState title={t('tabs.monitoringSoon')} pose="idle" />
        </Screen>
      )}
    </TabRoot>
  );
}
