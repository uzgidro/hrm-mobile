// v3 planshet navigatsiyasi (medium/expanded) — pastki tab bar o'rnida.
// Yuqorida `visibleTabs` (telefondagi tablar bilan bir xil), pastda web v2
// katalogi bo'limlari (`visibleCatalog` → canAccessPage), shuning uchun kim nimani
// ko'rishi telefon bilan 1:1. «Tomchi × v2»: har bandning o'z rangi, faol band
// shu rangning yumshoq fonida.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeProvider';
import { moduleTint, radii, type ModuleTintKey } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from '../ui/Text';
import { visibleTabs, TAB_META, type TabKey } from '../utils/tabs';
import { catalogBySection, visibleCatalog } from '../utils/moduleCatalog';
import { useBreakpoint } from '../utils/responsive';
import { useNavSettings } from '../lib/navSettings';
import { menuBadgesQuery } from '../lib/menuBadges';

const RAIL_COLLAPSED_WIDTH = 92;
const RAIL_EXPANDED_WIDTH = 264;

export function tabRoute(key: TabKey): string {
  return key === 'index' ? '/(tabs)' : `/(tabs)/${key}`;
}

export function NavRail() {
  const { user } = useAuthStore();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const pathname = usePathname();
  const { sizeClass } = useBreakpoint();
  // Landshaft telefonda ham rail chiqadi — notch / status bar / home indicator ostida qolmasin.
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(sizeClass === 'expanded');
  const navOverrides = useNavSettings();
  const { data: badges } = useQuery(menuBadgesQuery());

  const tabs = useMemo(
    () => visibleTabs(user),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, navOverrides],
  );
  const sections = useMemo(
    () => catalogBySection(visibleCatalog(user).filter((m) => m.page !== 'home')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, navOverrides],
  );
  const docBadge = (badges?.orders ?? 0) + (badges?.letters ?? 0) + (badges?.documents ?? 0);

  const isActive = (route: string) => {
    const bare = route.replace('/(tabs)', '') || '/';
    return pathname === bare || pathname === route;
  };

  return (
    <View
      testID="nav-rail"
      style={[
        styles.rail,
        {
          backgroundColor: c.surface,
          borderRightColor: c.border,
          paddingTop: 12 + insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
        },
        { width: expanded ? RAIL_EXPANDED_WIDTH : RAIL_COLLAPSED_WIDTH },
      ]}
    >
      <Pressable
        style={styles.toggle}
        onPress={() => setExpanded((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('common.all')}
      >
        <Icon name={expanded ? 'chevronLeft' : 'chevronRight'} size={18} color={c.fgSubtle} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {tabs.map((key) => {
          const meta = TAB_META[key];
          const route = tabRoute(key);
          return (
            <Row
              key={key}
              testID={`rail-${key}`}
              icon={meta.icon}
              tint={meta.tint}
              label={t(meta.labelKey)}
              route={route}
              active={isActive(route)}
              expanded={expanded}
              badge={key === 'documents' ? docBadge : undefined}
            />
          );
        })}

        {sections.length > 0 && <View style={[styles.divider, { backgroundColor: c.border }]} />}

        {sections.map((section) => (
          <View key={section.section} style={styles.section}>
            {expanded && (
              <Text variant="caption" tone="subtle" style={styles.sectionLabel}>
                {t(`modules.sections.${section.section}`)}
              </Text>
            )}
            {section.items.map((m) => (
              <Row
                key={m.page}
                testID={`rail-mod-${m.page}`}
                icon={m.icon}
                tint={m.tint}
                label={t(m.labelKey)}
                route={m.route}
                active={isActive(m.route)}
                expanded={expanded}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  tint,
  label,
  route,
  active,
  expanded,
  badge,
  testID,
}: {
  icon: IconName;
  tint: ModuleTintKey;
  label: string;
  route: string;
  active: boolean;
  expanded: boolean;
  badge?: number;
  testID: string;
}) {
  const { colors: c } = useTheme();
  const t = moduleTint(c, tint);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={() => router.push(route as Href)}
      style={({ pressed }) => [
        styles.row,
        !expanded && styles.rowCollapsed,
        active && { backgroundColor: t.wash },
        pressed && !active && { backgroundColor: c.surface2 },
      ]}
    >
      <View style={styles.iconWrap}>
        <Icon name={icon} size={22} color={t.fg} strokeWidth={active ? 2.4 : 2} />
        {!!badge && badge > 0 && (
          <View style={[styles.badge, { backgroundColor: c.dangerMark, borderColor: c.surface }]}>
            <Text variant="caption" tone="onBrand" style={styles.badgeText}>
              {badge > 9 ? '9+' : String(badge)}
            </Text>
          </View>
        )}
      </View>
      <Text
        variant="label"
        tone={active ? 'fg' : 'muted'}
        numberOfLines={1}
        style={[expanded ? styles.label : styles.labelCollapsed, active && styles.labelActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: { borderRightWidth: StyleSheet.hairlineWidth },
  toggle: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  content: { paddingHorizontal: 8, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    marginBottom: 2,
  },
  // Yig'ilgan rail (92px): ikonka ustida kichik markaziy yozuv.
  rowCollapsed: { flexDirection: 'column', gap: 3, paddingHorizontal: 4 },
  iconWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '800' },
  label: { flexShrink: 1 },
  labelCollapsed: { fontSize: 10, lineHeight: 13, textAlign: 'center', alignSelf: 'stretch' },
  labelActive: { fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12, marginHorizontal: 8 },
  section: { marginBottom: 8 },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginLeft: 12, marginTop: 4 },
});
