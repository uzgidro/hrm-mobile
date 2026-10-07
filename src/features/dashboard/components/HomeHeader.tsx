// Bosh sahifa headeri (v2 top bar'ning telefon shakli): salomlashuv + sana/bo'lim,
// o'ngda qidiruv (modullar — v2 katalogidan), bildirishnomalar, mavzu.
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { menuBadgesQuery } from '@/lib/menuBadges';
import { useNavSettings } from '@/lib/navSettings';
import { monthName, weekdayName } from '@/i18n/dates';
import { visibleCatalog } from '@/utils/moduleCatalog';
import { moduleTint } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { IconButton, ListRow, SearchField, Sheet, Text } from '@/ui';
import { userDisplayName } from '@/utils/roles';
import type { User } from '@/types';
import { givenName } from '../utils/shiftProgress';
import { foldText } from '@/utils/searchFold';

export function greetingKey(hour: number): string {
  if (hour < 12) return 'dashboard.home.greetingMorning';
  if (hour < 18) return 'dashboard.home.greetingDay';
  return 'dashboard.home.greetingEvening';
}

/**
 * Whom the greeting addresses. A person's card (employee, or the admin account's own
 * `legal_name`) → the given name; any other account → `userDisplayName` as is (kiosk
 * name, login, e-mail — v2 getDisplayName). Master/admin used to read «Foydalanuvchi».
 */
export function greetingName(user?: User | null): string {
  const personal = (user?.employee?.legal_name ?? user?.admin?.legal_name ?? '').trim();
  if (personal) return givenName(personal);
  return userDisplayName(user) ?? '';
}

export function HomeHeader() {
  const { t } = useTranslation();
  const { colors: c, isDark, setMode } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: badges } = useQuery(menuBadgesQuery());
  // Modul sozlamalari (nav.modules) kelganda qidiruv natijalari yangilansin.
  const navOverrides = useNavSettings();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const now = dayjs();
  const name = greetingName(user) || t('dashboard.userFallback');
  const dateLine = `${weekdayName(now.day())}, ${now.date()} ${monthName(now.month(), { genitive: true })}`;
  const dept = user?.employee?.department?.name;

  const results = useMemo(() => {
    const q = foldText(query.trim());
    const all = visibleCatalog(user).filter((m) => m.page !== 'home');
    return q ? all.filter((m) => foldText(t(m.labelKey)).includes(q)) : all.slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, user, t, navOverrides]);

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="title" numberOfLines={1} testID="home-greeting" accessibilityRole="header">
          {t(greetingKey(now.hour()), { name })}
        </Text>
        <Text variant="caption" tone="subtle" numberOfLines={1}>
          {dept ? `${dateLine} · ${dept}` : dateLine}
        </Text>
      </View>
      <IconButton icon="search" accessibilityLabel={t('dashboard.home.searchTitle')} onPress={() => setSearchOpen(true)} />
      <IconButton
        icon="bell"
        accessibilityLabel={t('modules.labels.notifications')}
        badge={badges?.unread_notifications}
        onPress={() => router.push('/notifications' as Href)}
      />
      <IconButton
        icon={isDark ? 'sun' : 'moon'}
        accessibilityLabel={t('dashboard.home.toggleTheme')}
        onPress={() => setMode(isDark ? 'light' : 'dark')}
      />

      <Sheet scroll visible={searchOpen} onClose={() => setSearchOpen(false)} title={t('dashboard.home.searchTitle')}>
        <SearchField value={query} onChangeText={setQuery} placeholder={t('dashboard.home.searchPlaceholder')} autoFocus />
        <View style={styles.results}>
          {results.map((m) => {
            const tint = moduleTint(c, m.tint);
            return (
              <ListRow
                key={m.page}
                title={t(m.labelKey)}
                left={
                  <View style={[styles.icon, { backgroundColor: tint.wash }]}>
                    <Icon name={m.icon} size={18} color={tint.fg} />
                  </View>
                }
                chevron
                onPress={() => {
                  setSearchOpen(false);
                  router.push(m.route as Href);
                }}
              />
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 8, paddingBottom: 12 },
  text: { flex: 1, minWidth: 0, marginRight: 4 },
  results: { marginTop: 8 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
