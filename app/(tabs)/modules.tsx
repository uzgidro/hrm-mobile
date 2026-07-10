import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import { Icon, IconName } from '../../src/components/Icon';
import { canAccessPage, type PageKey } from '../../src/utils/roles';
import { homeAssignedLeavesQuery, homeNotificationsQuery } from '@/features/dashboard/api/queries';

type Item = { key: string; icon: IconName; label: string; route: string; access: PageKey; badge?: number };
type Section = { title: string; items: Item[] };

export default function ModulesScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const isSupervisor = !employee?.supervisor;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const { t } = useTranslation();

  const tileWidth = (width - 16 * 2 - 12 * 2) / 3;

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

  const sections: Section[] = useMemo(() => {
    const raw: Section[] = [
      {
        title: t('modules.sections.activity'),
        items: [
          { key: 'attendance', icon: 'clock', label: t('modules.labels.attendance'), route: '/attendance-detail', access: 'attendance' },
          { key: 'requests', icon: 'checklist', label: t('modules.labels.requests'), route: '/work-leaves', access: 'requests', badge: pendingCount },
          { key: 'projects', icon: 'board', label: t('modules.labels.projects'), route: '/loyihalar', access: 'projects' },
          { key: 'salary', icon: 'wallet', label: t('modules.labels.salary'), route: '/salary', access: 'salary' },
        ],
      },
      {
        title: t('modules.sections.team'),
        items: [
          { key: 'team', icon: 'users', label: t('modules.labels.team'), route: '/team', access: 'team' },
          { key: 'employees', icon: 'idcard', label: t('modules.labels.employees'), route: '/employees-list', access: 'employees' },
          { key: 'guests', icon: 'guest', label: t('modules.labels.guests'), route: '/(tabs)/mehmonlar', access: 'guests' },
          { key: 'birthdays', icon: 'gift', label: t('modules.labels.birthdays'), route: '/birthdays', access: 'birthdays' },
        ],
      },
      {
        title: t('modules.sections.other'),
        items: [
          { key: 'news', icon: 'news', label: t('modules.labels.news'), route: '/news', access: 'news' },
          { key: 'notifications', icon: 'bell', label: t('modules.labels.notifications'), route: '/notifications', access: 'notifications', badge: unreadCount },
          { key: 'profile', icon: 'user', label: t('modules.labels.profile'), route: '/(tabs)/profile', access: 'profile' },
        ],
      },
    ];
    // Role-based visibility — mirrors the web nav per user type.
    return raw
      .map((s) => ({ ...s, items: s.items.filter((it) => canAccessPage(user, it.access)) }))
      .filter((s) => s.items.length > 0);
  }, [pendingCount, unreadCount, user, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
                  <View style={styles.iconWrap}>
                    <Icon name={item.icon} size={24} color={colors.primary} />
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
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: 26, fontWeight: '800', color: c.text },
    content: { paddingHorizontal: 16, paddingTop: 4 },

    section: { marginBottom: 20 },
    sectionLabel: {
      fontSize: 12, fontWeight: '700', color: c.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginLeft: 2,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

    tile: {
      backgroundColor: c.card, borderRadius: 16, paddingVertical: 18,
      alignItems: 'center', gap: 10, borderWidth: 1, borderColor: c.cardBorder,
    },
    iconWrap: {
      width: 48, height: 48, borderRadius: 14, backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    badge: {
      position: 'absolute', top: -4, right: -4, backgroundColor: c.warning,
      borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 4, borderWidth: 2, borderColor: c.card,
    },
    badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
    tileLabel: { fontSize: 12, color: c.text, fontWeight: '600', textAlign: 'center' },
  });
