// v3 Monitoring tabi. Davomatga ruxsati bor (monitoring operatori) — tashkilot
// davomati; kiosk akkaunt uchun katalog davomatni bermaydi (v2 POST_ACCOUNT_KEYS),
// shuning uchun ruxsatsiz, filtrlanmagan so'rov o'rniga — to'liq monitoring ekrani
// (W2) kelguncha «tez orada» holati.
import { useTranslation } from 'react-i18next';
import AttendanceDetailScreen from '@/features/attendance/screens/AttendanceDetailScreen';
import { useAuthStore } from '@/store/authStore';
import { useNavSettings } from '@/lib/navSettings';
import { canAccessPage } from '@/utils/roles';
import { EmptyState, Screen } from '@/ui';

export default function MonitoringTab() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  useNavSettings();
  if (canAccessPage(user, 'attendance')) return <AttendanceDetailScreen />;
  return (
    <Screen scroll={false}>
      <EmptyState title={t('tabs.monitoringSoon')} pose="idle" />
    </Screen>
  );
}
