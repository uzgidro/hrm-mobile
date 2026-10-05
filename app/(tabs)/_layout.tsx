// v3 tab qobig'i («Tomchi × v2», spec §5). Qaysi tablar ko'rinishi — `visibleTabs`
// (rol + v2 katalogi + nav.modules); telefonda pastki `TabBar`, planshetda (medium/
// expanded) yon `NavRail` — u root layout'da (har ekran yonida), bu yerda faqat tab
// bar yashiriladi. Ko'rinmaydigan tablar `href: null` — deep link / push yo'llari
// ishlashda davom etadi.
import { useEffect } from 'react';
import { Tabs, router, useSegments, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { useBreakpoint } from '@/utils/responsive';
import { menuBadgesQuery } from '@/lib/menuBadges';
import { useNavSettings } from '@/lib/navSettings';
import { visibleTabs, ALL_TABS, tabRedirect, startRoute, startTab } from '@/utils/tabs';
import { canAccessPage } from '@/utils/roles';
import { TabBar } from '@/features/shell/components/TabBar';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { useRail } = useBreakpoint();
  const { data: badges } = useQuery(menuBadgesQuery());
  // Re-render the tab set once the master admin's module matrix arrives.
  useNavSettings();
  const visible = visibleTabs(user);
  const start = startTab(user, visible);
  const docBadge = (badges?.orders ?? 0) + (badges?.letters ?? 0) + (badges?.documents ?? 0);
  // Modullar tabidagi nishon — kutilayotgan so'rovlar; So'rovlar moduli (v2
  // requestPermission) yo'q rolga u hech qayerga olib bormaydi.
  const modulesBadge = canAccessPage(user, 'requests') ? (badges?.leaves ?? 0) : 0;

  // Rol keyinroq (auth/me) o'zgarsa — keshdagi foydalanuvchi bilan ochilgan tab
  // endi ruxsatsiz bo'lishi mumkin; devonxona esa `/` ni ochganda (Asosiy tabi
  // yo'q) — boshlang'ich tabga o'tamiz (devonxona: Hujjatlar · Buyruqlar, v2).
  const segments = useSegments() as string[];
  const active = segments[0] === '(tabs)' ? (segments[1] ?? 'index') : undefined;
  const redirectTo = tabRedirect(active, visible, start);
  const redirectRoute = redirectTo ? startRoute(user, visible) : null;
  useEffect(() => {
    if (redirectRoute) router.replace(redirectRoute as Href);
  }, [redirectRoute]);

  return (
    <Tabs
      // System back / edge-swipe walks BACK THROUGH VISITED TABS instead of
      // the default 'firstRoute' jump to Home.
      backBehavior="history"
      // Kiosk akkauntlarda — post / monitoring, devonxonada — Hujjatlar.
      initialRouteName={start}
      tabBar={(props) =>
        useRail ? null : <TabBar {...props} visible={visible} badges={{ documents: docBadge, modules: modulesBadge }} />
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
  );
}
