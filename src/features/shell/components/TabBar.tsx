// v3 pastki tab bar («Tomchi × v2»): har tabning o'z rangi (Tomchi), faol tab —
// shu rangning yumshoq ramkasida (Duolingo tab bar), yozuvlar ko'rinadi (keng
// auditoriya), fon/chegara — v2 yuzasi. Qaysi tablar chiqishi `visibleTabs`.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { moduleTint, radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Text } from '@/ui';
import { TAB_META, type TabKey } from '@/utils/tabs';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

export function TabBar({
  state,
  navigation,
  visible,
  badges,
}: TabBarProps & { visible: TabKey[]; badges?: Partial<Record<TabKey, number>> }) {
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom + 6 }]}
    >
      {visible.map((key) => {
        const route = state.routes.find((r) => r.name === key);
        if (!route) return null;
        const meta = TAB_META[key];
        const tint = moduleTint(c, meta.tint);
        const focused = activeName === key;
        const badge = badges?.[key];
        const label = t(meta.labelKey);
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={key}
            onPress={onPress}
            testID={meta.testID}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            style={styles.item}
          >
            <View
              style={[
                styles.iconBox,
                focused && { backgroundColor: tint.wash, borderColor: `${tint.fg}55` },
              ]}
            >
              <Icon name={meta.icon} size={24} color={tint.fg} strokeWidth={focused ? 2.4 : 2} />
              {!!badge && badge > 0 && (
                <View style={[styles.badge, { backgroundColor: c.dangerMark, borderColor: c.surface }]}>
                  <Text variant="caption" tone="onBrand" style={styles.badgeText}>
                    {badge > 9 ? '9+' : String(badge)}
                  </Text>
                </View>
              )}
            </View>
            <Text
              variant="caption"
              tone={focused ? 'fg' : 'subtle'}
              numberOfLines={1}
              style={[styles.label, focused && styles.labelActive]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 52 },
  iconBox: {
    width: 52,
    height: 34,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 11, lineHeight: 14 },
  labelActive: { fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '800' },
});
