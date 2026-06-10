import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants';

function TabIcon({ focused, emoji, label }: { focused: boolean; emoji: string; label: string }) {
  return (
    <View style={styles.tabIconWrapper}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.tabBar,
          borderTopColor: COLORS.tabBarBorder,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🏠" label="Asosiy" />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="📅" label="Kalendar" />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="📰" label="Yangiliklar" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="👤" label="Profil" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: { alignItems: 'center', gap: 3, paddingTop: 2 },
  tabEmoji: { fontSize: 22, opacity: 0.5 },
  tabEmojiActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  tabLabelActive: { color: COLORS.primaryLight, fontWeight: '700' },
});
