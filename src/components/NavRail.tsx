// Tablet left navigation rail — replaces the bottom tab bar on tablets
// (wired in app/(tabs)/_layout.tsx, Task 18). Renders the four primary
// destinations (Home/Orders/Letters/Modules) plus the SAME role-filtered
// sections as the phone Modules grid, both sourced from `buildNavSections`
// (src/utils/navItems.ts) so web-parity page visibility stays 1:1 — this
// component does NOT define its own item list.
import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { Icon, type IconName } from './Icon';
import { buildNavSections, type NavItem } from '../utils/navItems';
import { homeAssignedLeavesQuery, homeNotificationsQuery } from '@/features/dashboard/api/queries';

const RAIL_COLLAPSED_WIDTH = 88;
const RAIL_EXPANDED_WIDTH = 260;

type PrimaryItem = { key: string; icon: IconName; route: string; labelKey: string };

// The four destinations always reachable from the bottom bar on phone —
// mirrored here so the rail always offers them regardless of role (same as
// the phone bottom bar, which shows Home/Orders/Letters/Modules to everyone
// and gates Orders/Letters visibility via `href` on the tab, not by omission
// from the bar itself).
const PRIMARY: PrimaryItem[] = [
  { key: 'home', icon: 'home', route: '/(tabs)', labelKey: 'modules.labels.home' },
  { key: 'orders', icon: 'orders', route: '/(tabs)/orders', labelKey: 'modules.labels.orders' },
  { key: 'letters', icon: 'mail', route: '/(tabs)/letters', labelKey: 'modules.labels.letters' },
  { key: 'modules', icon: 'grid', route: '/(tabs)/modules', labelKey: 'modules.labels.modules' },
];

export function NavRail() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const isSupervisor = !employee?.supervisor;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  // Same home factories + derivation as app/(tabs)/modules.tsx so the badge
  // counts on the rail always match the phone grid's counts.
  const { data: assignedLeaves = [] } = useQuery({
    ...homeAssignedLeavesQuery(employee?.id),
    enabled: !!employee?.id && isSupervisor,
  });

  const { data: notifications = [] } = useQuery({
    ...homeNotificationsQuery(employee?.id),
  });

  const pendingCount = useMemo(() => {
    if (!isSupervisor) return 0;
    return assignedLeaves.filter(
      (l) => (l.status === 'pending' || l.status === 'yuborildi') && !l.signers?.some((s) => s.id === employee?.id)
    ).length;
  }, [assignedLeaves, isSupervisor, employee?.id]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  const sections = useMemo(
    () => buildNavSections(t, { user, employee, pendingCount, unreadCount }),
    [t, user, employee, pendingCount, unreadCount]
  );

  const isActive = (route: string) => pathname === route || pathname === route.replace('/(tabs)', '');

  return (
    <View style={[styles.rail, expanded ? styles.railExpanded : styles.railCollapsed]}>
      <TouchableOpacity
        style={styles.toggle}
        activeOpacity={0.75}
        onPress={() => setExpanded((v) => !v)}
        hitSlop={8}
      >
        <Icon name={expanded ? 'chevronLeft' : 'chevronRight'} size={18} color={colors.tabBarInactive} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {PRIMARY.map((item) => (
          <Row
            key={item.key}
            icon={item.icon}
            label={t(item.labelKey)}
            route={item.route}
            active={isActive(item.route)}
            expanded={expanded}
            colors={colors}
            styles={styles}
          />
        ))}

        <View style={styles.divider} />

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            {expanded && <Text style={styles.sectionLabel}>{section.title}</Text>}
            {section.items.map((item) => (
              <Row
                key={item.key}
                icon={item.icon}
                label={item.label}
                route={item.route}
                active={isActive(item.route)}
                expanded={expanded}
                badge={item.badge}
                colors={colors}
                styles={styles}
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
  label,
  route,
  active,
  expanded,
  badge,
  colors,
  styles,
}: {
  icon: IconName;
  label: string;
  route: string;
  active: boolean;
  expanded: boolean;
  badge?: NavItem['badge'];
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, active && styles.rowActive]}
      activeOpacity={0.75}
      onPress={() => router.push(route as Href)}
    >
      <View style={styles.iconWrap}>
        <Icon
          name={icon}
          size={22}
          color={active ? colors.tabBarActive : colors.tabBarInactive}
          strokeWidth={active ? 2.2 : 1.9}
        />
        {badge != null && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text
        style={[
          expanded ? styles.rowLabel : styles.rowLabelCollapsed,
          active && styles.rowLabelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    rail: {
      backgroundColor: c.tabBar,
      borderRightWidth: 1,
      borderRightColor: c.tabBarBorder,
      paddingTop: 12,
    },
    railCollapsed: { width: RAIL_COLLAPSED_WIDTH },
    railExpanded: { width: RAIL_EXPANDED_WIDTH },

    toggle: {
      alignSelf: 'flex-end',
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      marginBottom: 4,
    },

    content: { paddingHorizontal: 8, paddingBottom: 24 },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 14,
      marginBottom: 2,
    },
    rowActive: { backgroundColor: c.tabBarActiveBg },

    iconWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    badge: {
      position: 'absolute', top: -4, right: -6, backgroundColor: c.warning,
      borderRadius: 9, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 3, borderWidth: 1.5, borderColor: c.tabBar,
    },
    badgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },

    rowLabel: { fontSize: 13, fontWeight: '600', color: c.tabBarInactive, flexShrink: 1 },
    rowLabelCollapsed: { fontSize: 9.5, fontWeight: '600', color: c.tabBarInactive, textAlign: 'center', flex: 1 },
    rowLabelActive: { color: c.tabBarActive, fontWeight: '700' },

    divider: { height: 1, backgroundColor: c.tabBarBorder, marginVertical: 12, marginHorizontal: 8 },

    section: { marginBottom: 8 },
    sectionLabel: {
      fontSize: 11, fontWeight: '700', color: c.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginLeft: 10, marginTop: 4,
    },
  });
