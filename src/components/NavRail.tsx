// Tablet left navigation rail — replaces the bottom tab bar on tablets
// (wired in app/(tabs)/_layout.tsx, Task 18). Renders the four primary
// destinations (Home/Orders/Letters/Modules), filtered through canAccessPage
// same as the phone bottom bar's `href` gating, plus the SAME role-filtered
// sections as the phone Modules grid, sourced from `buildNavSections`
// (src/utils/navItems.ts) so web-parity page visibility stays 1:1.
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
import { canAccessPage, type PageKey } from '../utils/roles';
import { leaveStatusGroup } from '../utils/leaveStatus';
import { homeAssignedLeavesQuery, homeNotificationsQuery } from '@/features/dashboard/api/queries';

const RAIL_COLLAPSED_WIDTH = 88;
const RAIL_EXPANDED_WIDTH = 260;

type PrimaryItem = { key: string; icon: IconName; route: string; labelKey: string; access?: PageKey };

// The four destinations reachable from the bottom bar on phone — mirrored
// here so the rail offers the same set, filtered the same way: the phone
// bottom bar gates Orders/Letters visibility via `href: null` on the tab
// (driven by canAccessPage), so the rail filters PRIMARY through
// canAccessPage too (below) rather than rendering it unconditionally. Home
// and Modules have no restrictive PageKey rule (`home` always passes
// canAccessPage; `modules` is a hub with no PageKey) so they're left
// unfiltered (`access` omitted).
const PRIMARY: PrimaryItem[] = [
  { key: 'home', icon: 'home', route: '/(tabs)', labelKey: 'modules.labels.home' },
  { key: 'orders', icon: 'orders', route: '/(tabs)/orders', labelKey: 'modules.labels.orders', access: 'orders' },
  { key: 'letters', icon: 'mail', route: '/(tabs)/letters', labelKey: 'modules.labels.letters', access: 'letters' },
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
      (l) => leaveStatusGroup(l.status) === 'pending' && !l.signers?.some((s) => s.id === employee?.id)
    ).length;
  }, [assignedLeaves, isSupervisor, employee?.id]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  const sections = useMemo(
    () => buildNavSections(t, { user, employee, pendingCount, unreadCount }),
    [t, user, employee, pendingCount, unreadCount]
  );

  // Same web-parity filter buildNavSections already applies to the section
  // items — an item without `access` (home, modules) always shows.
  const primary = useMemo(
    () => PRIMARY.filter((item) => !item.access || canAccessPage(user, item.access)),
    [user]
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
        {primary.map((item) => (
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
      style={[styles.row, !expanded && styles.rowCollapsed, active && styles.rowActive]}
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
    // Collapsed rail (88px) stacks the icon over a small centered label — a
    // horizontal row can't fit a word beside the icon in 88px, so the label got
    // truncated ("Главна", "Посе"). Mirrors the bottom-tab icon-over-label shape.
    rowCollapsed: { flexDirection: 'column', gap: 3, paddingHorizontal: 4 },
    rowActive: { backgroundColor: c.tabBarActiveBg },

    iconWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    badge: {
      position: 'absolute', top: -4, right: -6, backgroundColor: c.warning,
      borderRadius: 9, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 3, borderWidth: 1.5, borderColor: c.tabBar,
    },
    badgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },

    rowLabel: { fontSize: 13, fontWeight: '600', color: c.tabBarInactive, flexShrink: 1 },
    rowLabelCollapsed: { fontSize: 9.5, fontWeight: '600', color: c.tabBarInactive, textAlign: 'center', alignSelf: 'stretch' },
    rowLabelActive: { color: c.tabBarActive, fontWeight: '700' },

    divider: { height: 1, backgroundColor: c.tabBarBorder, marginVertical: 12, marginHorizontal: 8 },

    section: { marginBottom: 8 },
    sectionLabel: {
      fontSize: 11, fontWeight: '700', color: c.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginLeft: 10, marginTop: 4,
    },
  });
