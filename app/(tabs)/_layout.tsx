import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import { Icon, IconName } from '../../src/components/Icon';
import { useAuthStore } from '../../src/store/authStore';
import { canAccessPage } from '../../src/utils/roles';
import { useBreakpoint } from '../../src/utils/responsive';
import { NavRail } from '../../src/components/NavRail';
import { menuBadgesQuery } from '../../src/features/notifications/api/queries';
import { ff } from '../../src/theme/typography';
import { useNavSettings } from '../../src/lib/navSettings';

// Dizayn «I · Tomchi»: har bir tabning o'z rangi bor (Asosiy — ko'k, Buyruqlar —
// to'q sariq, Xatlar — yashil, Modullar — binafsha). Faol tab yumshoq fonli
// ramkada; yozuvlar ko'rinmaydi, lekin ekran o'quvchiga aytiladi.
const TAB_TINT: Record<string, string> = {
  home: '#1CB0F6',
  orders: '#FF9600',
  mail: '#2BC155',
  grid: '#CE82FF',
};

function TabIcon({
  focused, name, colors, badge,
}: { focused: boolean; name: IconName; colors: ThemeColors; badge?: number }) {
  const tint = TAB_TINT[name] ?? colors.tabBarActive;
  return (
    <View
      style={[
        styles.box,
        focused && { backgroundColor: colors.tabBarActiveBg, borderColor: colors.tabBarActiveBorder },
      ]}
    >
      <Icon name={name} size={26} color={tint} strokeWidth={focused ? 2.4 : 2.1} />
      {/* Amal kutayotgan hujjatlar soni — web chap menyusidagi qizil raqam
          (backend notifications/menu-badges). */}
      {!!badge && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.error, borderColor: colors.tabBar }]}>
          <Text style={[styles.badgeText, ff('900')]}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const bp = useBreakpoint();
  const useRail = bp.isTablet;
  const { data: menuBadges } = useQuery(menuBadgesQuery());
  // Re-render the tab hrefs once the master admin's module matrix arrives.
  useNavSettings();

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {useRail && <NavRail />}
      <View style={{ flex: 1 }}>
        <Tabs
          // System back / edge-swipe walks BACK THROUGH VISITED TABS (e.g.
          // Modules → Mehmonlar → back lands on Modules) instead of the default
          // 'firstRoute' jump to Home, which read as "the path got lost".
          backBehavior="history"
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: colors.bg },
            tabBarStyle: useRail
              ? { display: 'none' }
              : {
                  backgroundColor: colors.tabBar,
                  borderTopColor: colors.tabBarBorder,
                  borderTopWidth: 2,
                  height: 68 + insets.bottom,
                  paddingBottom: insets.bottom,
                  paddingTop: 8,
                  elevation: 0,
                },
            tabBarShowLabel: false,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{ tabBarButtonTestID: 'tab-home', tabBarAccessibilityLabel: t('modules.labels.home'), tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="home" colors={colors} /> }}
          />
          <Tabs.Screen
            name="orders"
            options={{
              href: canAccessPage(user, 'orders') ? undefined : null,
              tabBarButtonTestID: 'tab-orders',
              tabBarAccessibilityLabel: t('modules.labels.orders'),
              tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="orders" colors={colors} badge={menuBadges?.orders} />,
            }}
          />
          <Tabs.Screen
            name="letters"
            options={{
              href: canAccessPage(user, 'letters') ? undefined : null,
              tabBarButtonTestID: 'tab-letters',
              tabBarAccessibilityLabel: t('modules.labels.letters'),
              tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="mail" colors={colors} badge={menuBadges?.letters} />,
            }}
          />
          <Tabs.Screen
            name="modules"
            options={{ tabBarButtonTestID: 'tab-modules', tabBarAccessibilityLabel: t('modules.labels.modules'), tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="grid" colors={colors} /> }}
          />
          {/* Mehmonlar va Profil — bottom bardan olib tashlandi; Modullar plitkasi
              orqali ochiladi (bar-less tab + header chevron + backBehavior history). */}
          <Tabs.Screen name="mehmonlar" options={{ href: null }} />
          <Tabs.Screen name="profile" options={{ href: null }} />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 60, height: 50, borderRadius: 14, borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 1, right: 5, minWidth: 17, height: 17, borderRadius: 9,
    borderWidth: 1.5, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10 },
});
