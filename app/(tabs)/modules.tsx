import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/authStore';
import { apiClient } from '../../src/api/client';
import { WORK_LEAVES, NOTIFICATIONS_LIST } from '../../src/api/urls';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import { Icon, IconName } from '../../src/components/Icon';
import { canAccessPage, type PageKey } from '../../src/utils/roles';
import type { WorkLeave } from '../../src/types';

type Item = { key: string; icon: IconName; label: string; route: string; access: PageKey; badge?: number };
type Section = { title: string; items: Item[] };

export default function ModulesScreen() {
  const { user } = useAuthStore();
  const employee = user?.employee;
  const isSupervisor = !employee?.supervisor;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();

  const tileWidth = (width - 16 * 2 - 12 * 2) / 3;

  const { data: assignedLeaves = [] } = useQuery<WorkLeave[]>({
    queryKey: ['assigned-leaves-home', employee?.id],
    queryFn: () =>
      apiClient.get(WORK_LEAVES, { params: { assigned_signer: true, size: 50 } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    enabled: !!employee?.id && isSupervisor,
    staleTime: 30 * 1000,
  });

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['notifications', employee?.id],
    queryFn: () =>
      apiClient.get(NOTIFICATIONS_LIST).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d?.items ?? []);
      }),
    enabled: !!employee?.id,
    staleTime: 30 * 1000,
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
        title: 'Faoliyat',
        items: [
          { key: 'attendance', icon: 'clock', label: 'Davomat', route: '/attendance-detail', access: 'attendance' },
          { key: 'requests', icon: 'checklist', label: "So'rovlar", route: '/work-leaves', access: 'requests', badge: pendingCount },
          { key: 'projects', icon: 'board', label: 'Loyihalar', route: '/loyihalar', access: 'projects' },
          { key: 'salary', icon: 'wallet', label: 'Oylik', route: '/salary', access: 'salary' },
        ],
      },
      {
        title: 'Jamoa',
        items: [
          { key: 'team', icon: 'users', label: 'Jamoa', route: '/team', access: 'team' },
          { key: 'employees', icon: 'idcard', label: 'Xodimlar', route: '/employees-list', access: 'employees' },
          { key: 'guests', icon: 'guest', label: 'Mehmonlar', route: '/(tabs)/mehmonlar', access: 'guests' },
          { key: 'birthdays', icon: 'gift', label: "Tug'ilgan kun", route: '/birthdays', access: 'birthdays' },
        ],
      },
      {
        title: 'Boshqa',
        items: [
          { key: 'news', icon: 'news', label: 'Yangiliklar', route: '/news', access: 'news' },
          { key: 'notifications', icon: 'bell', label: 'Bildirishnoma', route: '/notifications', access: 'notifications', badge: unreadCount },
          { key: 'profile', icon: 'user', label: 'Profil', route: '/(tabs)/profile', access: 'profile' },
        ],
      },
    ];
    // Role-based visibility — mirrors the web nav per user type.
    return raw
      .map((s) => ({ ...s, items: s.items.filter((it) => canAccessPage(user, it.access)) }))
      .filter((s) => s.items.length > 0);
  }, [pendingCount, unreadCount, user]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Modullar</Text>
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
                  onPress={() => router.push(item.route as any)}
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
