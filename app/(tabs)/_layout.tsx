import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import { Icon, IconName } from '../../src/components/Icon';
import { useAuthStore } from '../../src/store/authStore';
import { canAccessPage } from '../../src/utils/roles';

function TabIcon({
  focused, name, label, colors,
}: { focused: boolean; name: IconName; label: string; colors: ThemeColors }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.pill, focused && { backgroundColor: colors.tabBarActiveBg }]}>
        <Icon
          name={name}
          size={22}
          color={focused ? colors.tabBarActive : colors.tabBarInactive}
          strokeWidth={focused ? 2.2 : 1.9}
        />
      </View>
      <Text
        style={[
          styles.label,
          { color: focused ? colors.tabBarActive : colors.tabBarInactive, fontWeight: focused ? '700' : '500' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarButtonTestID: 'tab-home', tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="home" label={t('modules.labels.home')} colors={colors} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          href: canAccessPage(user, 'orders') ? undefined : null,
          tabBarButtonTestID: 'tab-orders',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="orders" label={t('modules.labels.orders')} colors={colors} />,
        }}
      />
      <Tabs.Screen
        name="letters"
        options={{
          href: canAccessPage(user, 'letters') ? undefined : null,
          tabBarButtonTestID: 'tab-letters',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="mail" label={t('modules.labels.letters')} colors={colors} />,
        }}
      />
      <Tabs.Screen
        name="modules"
        options={{ tabBarButtonTestID: 'tab-modules', tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="grid" label={t('modules.labels.modules')} colors={colors} /> }}
      />
      <Tabs.Screen
        name="mehmonlar"
        options={{ tabBarButtonTestID: 'tab-guests', tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="guest" label={t('modules.labels.guests')} colors={colors} /> }}
      />
      {/* Profil — bottom bardan olib tashlandi; tepadagi avatar va Modullar orqali ochiladi */}
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 3, width: 64 },
  pill: { width: 46, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10.5 },
});
