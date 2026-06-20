import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';

function TabIcon({
  focused, emoji, label, colors,
}: { focused: boolean; emoji: string; label: string; colors: ThemeColors }) {
  return (
    <View style={styles.tabIconWrapper}>
      <Text style={[styles.tabEmoji, { opacity: focused ? 1 : 0.45 }]}>{emoji}</Text>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? colors.primaryLight : colors.textMuted, fontWeight: focused ? '700' : '500' },
        ]}
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
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🏠" label="Asosiy" colors={colors} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="📄" label="Buyruqlar" colors={colors} /> }}
      />
      <Tabs.Screen
        name="news"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="📰" label="Yangiliklar" colors={colors} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="👤" label="Profil" colors={colors} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: { alignItems: 'center', gap: 3, paddingTop: 2, width: 70 },
  tabEmoji: { fontSize: 22 },
  tabLabel: { fontSize: 10 },
});
