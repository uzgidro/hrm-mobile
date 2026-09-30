// v3 tab qobig'i («Tomchi × v2», spec §5). Qaysi tablar ko'rinishi — `visibleTabs`
// (rol + v2 katalogi + nav.modules); telefonda pastki `TabBar`, planshetda (medium/
// expanded) yon `NavRail`. Ko'rinmaydigan tablar `href: null` — deep link / push
// yo'llari ishlashda davom etadi.
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { useBreakpoint } from '@/utils/responsive';
import { NavRail } from '@/components/NavRail';
import { menuBadgesQuery } from '@/lib/menuBadges';
import { useNavSettings } from '@/lib/navSettings';
import { visibleTabs, ALL_TABS } from '@/utils/tabs';
import { TabBar } from '@/features/shell/components/TabBar';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { useRail } = useBreakpoint();
  const { data: badges } = useQuery(menuBadgesQuery());
  // Re-render the tab set once the master admin's module matrix arrives.
  useNavSettings();
  const visible = visibleTabs(user);
  const docBadge = (badges?.orders ?? 0) + (badges?.letters ?? 0) + (badges?.documents ?? 0);

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      {useRail && <NavRail />}
      <View style={{ flex: 1 }}>
        <Tabs
          // System back / edge-swipe walks BACK THROUGH VISITED TABS instead of
          // the default 'firstRoute' jump to Home.
          backBehavior="history"
          // Kiosk akkauntlarda birinchi tab — post / monitoring.
          initialRouteName={visible[0]}
          tabBar={(props) =>
            useRail ? null : <TabBar {...props} visible={visible} badges={{ documents: docBadge, modules: badges?.leaves ?? 0 }} />
          }
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
        >
          {ALL_TABS.map((key) => (
            <Tabs.Screen key={key} name={key} options={{ href: visible.includes(key) ? undefined : null }} />
          ))}
          {/* Eski tab yo'llari: buyruq/xat → Hujjatlar segmenti (redirect), mehmonlar —
              Modullar/Post orqali ochiladigan barsiz ekran. */}
          <Tabs.Screen name="orders" options={{ href: null }} />
          <Tabs.Screen name="letters" options={{ href: null }} />
          <Tabs.Screen name="mehmonlar" options={{ href: null }} />
        </Tabs>
      </View>
    </View>
  );
}
