import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import { Icon, IconName } from '../../src/components/Icon';

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
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="home" label="Asosiy" colors={colors} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="orders" label="Buyruqlar" colors={colors} /> }}
      />
      <Tabs.Screen
        name="letters"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="mail" label="Xatlar" colors={colors} /> }}
      />
      <Tabs.Screen
        name="modules"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="grid" label="Modullar" colors={colors} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="user" label="Profil" colors={colors} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 3, width: 64 },
  pill: { width: 46, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10.5 },
});
