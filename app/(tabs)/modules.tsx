import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import { Icon } from '../../src/components/Icon';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/StateViews';
import { ff } from '../../src/theme/typography';
import { NO_WEB_OUTLINE } from '../../src/theme/web';
import { toneAt } from '../../src/theme/tones';
import { useBreakpoint, gridTileWidth, GRID_GAP, GRID_H_PAD } from '../../src/utils/responsive';
import { buildNavSections } from '../../src/utils/navItems';
import { homeAssignedLeavesQuery, homeNotificationsQuery } from '@/features/dashboard/api/queries';
import { menuBadgesQuery } from '@/features/notifications/api/queries';
import { useNavSettings } from '@/lib/navSettings';

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
  // Web v2: the grid follows the master admin's module matrix (nav.modules).
  const navOverrides = useNavSettings();

  const sections = useMemo(
    () => buildNavSections(t, { user, employee, pendingCount, unreadCount, menuBadges }),
    // navOverrides: canAccessPage reads the stored matrix — rebuild when it lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, user, employee, pendingCount, unreadCount, menuBadges, navOverrides]
  );

  // Modul qidirish (dizayn I): yorliq bo'yicha, harf katta-kichikligidan qat'i nazar.
  const [query, setQuery] = useState('');
  const visibleSections = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return sections;
    return sections
      .map((s) => ({ ...s, items: s.items.filter((i) => i.label.toLocaleLowerCase().includes(q)) }))
      .filter((s) => s.items.length > 0);
  }, [sections, query]);

  // Adaptive columns from the breakpoint; content capped so tiles don't stretch.
  // gridTileWidth FLOORS the width so 3 tiles + gaps always fit one row — a
  // fractional width rounds up on real devices and wraps the 3rd tile (the
  // "3 columns show as 2" bug on phones). See responsive.ts.
  const tileWidth = gridTileWidth(bp.contentMaxWidth, bp.width, bp.gridColumns);

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('modules.screenTitle')}</Text>
        <View style={styles.search}>
          <Icon name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('modules.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            returnKeyType="search"
            testID="modules-search"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} accessibilityLabel={t('modules.searchClear')}>
              <Icon name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {visibleSections.length === 0 ? (
        <EmptyState title={t('modules.searchEmpty')} icon="search" />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {visibleSections.map((section, si) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionLabel}>{section.title}</Text>
              <View style={styles.grid}>
                {section.items.map((item, n) => {
                  const tone = toneAt(n, si * 2);
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.tile, { width: tileWidth }]}
                      activeOpacity={0.75}
                      onPress={() => router.push(item.route as Href)}
                    >
                      <View
                        style={[
                          styles.iconWrap,
                          bp.isTablet && styles.iconWrapTablet,
                          { backgroundColor: tone.fill, borderBottomColor: tone.lip },
                        ]}
                      >
                        <Icon name={item.icon} size={bp.isTablet ? 30 : 26} color="#FFFFFF" strokeWidth={2.2} />
                        {item.badge != null && item.badge > 0 && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.tileLabel} numberOfLines={2}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, gap: 14 },
    title: { fontSize: 28, letterSpacing: -0.4, color: c.text, ...ff('900') },
    search: {
      height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
      borderRadius: 16, borderWidth: 2, borderColor: c.cardBorder, backgroundColor: c.inputBg,
    },
    searchInput: { flex: 1, height: '100%', fontSize: 16, color: c.text, ...NO_WEB_OUTLINE, ...ff('700') },
    content: { paddingHorizontal: GRID_H_PAD, paddingTop: 6 },

    section: { marginBottom: 18 },
    sectionLabel: {
      fontSize: 14, color: c.textSecondary, textTransform: 'uppercase',
      letterSpacing: 1, marginBottom: 10, marginLeft: 2, ...ff('900'),
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },

    tile: {
      minHeight: 104, backgroundColor: c.card, borderRadius: 16, paddingTop: 12, paddingBottom: 10,
      paddingHorizontal: 6, alignItems: 'center', justifyContent: 'space-between', gap: 8,
      borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder,
    },
    iconWrap: {
      width: 48, height: 48, borderRadius: 14, borderBottomWidth: 3,
      alignItems: 'center', justifyContent: 'center',
    },
    iconWrapTablet: { width: 58, height: 58, borderRadius: 16 },
    badge: {
      position: 'absolute', top: -6, right: -8, backgroundColor: c.error,
      borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 4, borderWidth: 2, borderColor: c.card,
    },
    badgeText: { fontSize: 10, color: '#fff', ...ff('900') },
    tileLabel: { fontSize: 13, lineHeight: 15, color: c.text, textAlign: 'center', ...ff('800') },
  });
