import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import { Icon } from '../../src/components/Icon';
import { Screen } from '../../src/components/Screen';
import { useBreakpoint, gridTileWidth, GRID_GAP, GRID_H_PAD } from '../../src/utils/responsive';
import { buildNavSections } from '../../src/utils/navItems';
import { homeAssignedLeavesQuery, homeNotificationsQuery } from '@/features/dashboard/api/queries';
import { menuBadgesQuery } from '@/features/notifications/api/queries';

export default function ModulesScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const isSupervisor = !employee?.supervisor;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  const { t } = useTranslation();

  // Reuse the dashboard's home factories so this tab shares their cache entries
  // (assigned-leaves keyed under ['work-leaves'] refreshes on any sign/reject;
  // notifications under ['notifications'] refreshes on push/mark-read).
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

  // Web menyusidagi QIZIL raqamlarning aynan o'zi (loyiha/hujjat/texnik yordam).
  // Bildirgi va Buyruqlar pastki tab bar'da — ular badge'ni o'sha yerda oladi.
  const { data: menuBadges } = useQuery(menuBadgesQuery());

  const sections = useMemo(
    () => buildNavSections(t, { user, employee, pendingCount, unreadCount, menuBadges }),
    [t, user, employee, pendingCount, unreadCount, menuBadges]
  );

  // Adaptive columns from the breakpoint; content capped so tiles don't stretch.
  // gridTileWidth FLOORS the width so 3 tiles + gaps always fit one row — a
  // fractional width rounds up on real devices and wraps the 3rd tile (the
  // "3 columns show as 2" bug on phones). See responsive.ts.
  const tileWidth = gridTileWidth(bp.contentMaxWidth, bp.width, bp.gridColumns);

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('modules.screenTitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={styles.grid}>
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.tile, { width: tileWidth }]}
                  activeOpacity={0.75}
                  onPress={() => router.push(item.route as Href)}
                >
                  <View style={[styles.iconWrap, bp.isTablet && styles.iconWrapTablet]}>
                    <Icon name={item.icon} size={bp.isTablet ? 28 : 24} color={colors.primary} />
                    {item.badge != null && item.badge > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.tileLabel} numberOfLines={1}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: 26, fontWeight: '800', color: c.text },
    content: { paddingHorizontal: GRID_H_PAD, paddingTop: 4 },

    section: { marginBottom: 20 },
    sectionLabel: {
      fontSize: 12, fontWeight: '700', color: c.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginLeft: 2,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },

    tile: {
      backgroundColor: c.card, borderRadius: 16, paddingVertical: 18,
      alignItems: 'center', gap: 10, borderWidth: 1, borderColor: c.cardBorder,
    },
    iconWrap: {
      width: 48, height: 48, borderRadius: 14, backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    iconWrapTablet: { width: 56, height: 56, borderRadius: 16 },
    badge: {
      position: 'absolute', top: -4, right: -4, backgroundColor: c.warning,
      borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 4, borderWidth: 2, borderColor: c.card,
    },
    badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
    tileLabel: { fontSize: 12, color: c.text, fontWeight: '600', textAlign: 'center' },
  });
