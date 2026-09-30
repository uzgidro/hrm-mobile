// v3 Modullar tabi: web v2 katalogi (visibleCatalog → canAccessPage + nav.modules)
// v2 bo'limlari bo'yicha, oxirida mobil-faqat plitkalar (tug'ilgan kunlar, oylik,
// bildirishnomalar, yordamchi, QR kirish). Plitka — «Tomchi × v2»: rangli ikonka
// kvadrati + yozuv, 1.5px chegara + pastki lab (bosiladigan).
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { LIP, moduleTint, radii, type ModuleTintKey } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { useNavSettings } from '@/lib/navSettings';
import { menuBadgesQuery, type MenuBadges } from '@/lib/menuBadges';
import { Icon, type IconName } from '@/components/Icon';
import { canAccessPage, type PageKey } from '@/utils/roles';
import { catalogBySection, visibleCatalog } from '@/utils/moduleCatalog';
import { useBreakpoint } from '@/utils/responsive';
import { EmptyState, Screen, SearchField, Text } from '@/ui';

type Tile = { key: string; label: string; icon: IconName; tint: ModuleTintKey; route: string; badge?: number };
type Group = { title: string; tiles: Tile[] };

const GAP = 10;

function badgeFor(page: string, b: MenuBadges | undefined): number | undefined {
  if (!b) return undefined;
  switch (page) {
    case 'orders':
      return b.orders;
    case 'letters':
      return b.letters;
    case 'documents':
      return b.documents;
    case 'projects':
      return b.projects;
    case 'support':
      return b.support;
    case 'vehicles':
      return b.fleet;
    case 'requests':
      return b.leaves;
    case 'notifications':
      return b.unread_notifications;
    default:
      return undefined;
  }
}

/** Qidiruv uchun: kichik harf, apostrof variantlari birlashtiriladi. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[‘’ʻʼ`]/g, "'").trim();
}

export default function ModulesScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navOverrides = useNavSettings();
  const { sizeClass } = useBreakpoint();
  const { data: badges } = useQuery(menuBadgesQuery());
  const [query, setQuery] = useState('');
  const [width, setWidth] = useState(0);

  const groups = useMemo<Group[]>(() => {
    const catalog = catalogBySection(visibleCatalog(user).filter((m) => m.page !== 'home')).map((g) => ({
      title: t(`modules.sections.${g.section}`),
      tiles: g.items.map((m) => ({
        key: m.page,
        label: t(m.labelKey),
        icon: m.icon,
        tint: m.tint,
        route: m.route,
        badge: badgeFor(m.page, badges),
      })),
    }));
    // Mobil-faqat sahifalar (v2 menyusida yo'q).
    const extras: (Tile & { page: PageKey })[] = [
      { page: 'birthdays', key: 'birthdays', label: t('modules.labels.birthdays'), icon: 'gift', tint: 'pink', route: '/birthdays' },
      { page: 'salary', key: 'salary', label: t('modules.labels.salary'), icon: 'wallet', tint: 'green', route: '/salary' },
      { page: 'notifications', key: 'notifications', label: t('modules.labels.notifications'), icon: 'bell', tint: 'amber', route: '/notifications', badge: badgeFor('notifications', badges) },
      { page: 'assistant', key: 'assistant', label: t('modules.labels.assistant'), icon: 'target', tint: 'violet', route: '/assistant' },
      ...(Platform.OS !== 'web'
        ? [{ page: 'profile' as PageKey, key: 'qrLogin', label: t('qrLogin.menu'), icon: 'qr' as IconName, tint: 'drop' as ModuleTintKey, route: '/qr-scan' }]
        : []),
    ];
    const other = extras.filter((x) => canAccessPage(user, x.page));
    return other.length ? [...catalog, { title: t('modules.sections.other'), tiles: other }] : catalog;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navOverrides, badges, t]);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return groups;
    return groups
      .map((g) => ({ ...g, tiles: g.tiles.filter((x) => norm(x.label).includes(q)) }))
      .filter((g) => g.tiles.length > 0);
  }, [groups, query]);

  const cols = sizeClass === 'expanded' ? 6 : sizeClass === 'medium' ? 4 : 3;
  const tileW = width > 0 ? Math.floor((width - GAP * (cols - 1)) / cols) : 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {t('modules.screenTitle')}
        </Text>
        <SearchField value={query} onChangeText={setQuery} placeholder={t('modules.searchPlaceholder')} />
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {filtered.length === 0 ? (
          <EmptyState title={t('modules.searchEmpty')} action={{ label: t('modules.searchClear'), onPress: () => setQuery('') }} />
        ) : (
          filtered.map((g) => (
            <View key={g.title} style={styles.group}>
              <Text variant="label" tone="subtle" style={styles.groupTitle}>
                {g.title}
              </Text>
              <View style={[styles.grid, { gap: GAP }]}>
                {g.tiles.map((tile) => (
                  <ModuleTile key={tile.key} tile={tile} width={tileW} />
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

function ModuleTile({ tile, width }: { tile: Tile; width: number }) {
  const { colors: c } = useTheme();
  const tint = moduleTint(c, tile.tint);
  return (
    <Pressable
      testID={`module-${tile.key}`}
      accessibilityRole="button"
      accessibilityLabel={tile.label}
      onPress={() => router.push(tile.route as Href)}
      style={width ? { width } : styles.tileFallback}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.tile,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              borderBottomWidth: pressed ? 1.5 : 1.5 + LIP,
              marginTop: pressed ? LIP : 0,
            },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: tint.wash }]}>
            <Icon name={tile.icon} size={24} color={tint.fg} />
            {!!tile.badge && tile.badge > 0 && (
              <View style={[styles.badge, { backgroundColor: c.dangerMark, borderColor: c.surface }]}>
                <Text variant="caption" tone="onBrand" style={styles.badgeText}>
                  {tile.badge > 9 ? '9+' : String(tile.badge)}
                </Text>
              </View>
            )}
          </View>
          <Text variant="label" numberOfLines={2} style={styles.tileLabel}>
            {tile.label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: 12, paddingTop: 8, paddingBottom: 8 },
  group: { marginTop: 12 },
  groupTitle: { textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tileFallback: { width: '30%' },
  tile: {
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    minHeight: 108,
  },
  iconBox: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { textAlign: 'center', fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '800' },
});
