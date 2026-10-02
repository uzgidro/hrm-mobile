// Monitoring — stack ekrani (master admin Modullar orqali ochadi). Alohida yo'l:
// /monitoring — (tabs)/monitoring tabi bilan to'qnashadi (expo-router guruh ichidagisini tanlaydi).
import MonitoringScreen from '@/features/monitoring/screens/MonitoringScreen';

export default function MonitoringRoute() {
  return <MonitoringScreen showBack />;
}
