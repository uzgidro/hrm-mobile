import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import MyDutyScreen from './MyDutyScreen';
import MyDutyGridScreen from './MyDutyGridScreen';

type DutyTab = 'list' | 'grid';

// Single "Navbatchilik" entry (web parity — the web has one Navbatchilik page
// hosting both the list and the grid). Owns the Screen shell + header + the
// list/grid switcher; each child renders body-only via its `embedded` prop.
// The old separate /navbatchilik-grid route still resolves for deep links.
export default function NavbatchilikScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<DutyTab>('list');

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('timesheet.dutyTitle')}</Text>
          <Text style={styles.headerSub}>
            {tab === 'list' ? t('timesheet.dutySubtitle') : t('timesheet.dutyGridSubtitle')}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'list' && styles.tabActive]}
          onPress={() => setTab('list')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'list' && styles.tabTextActive]}>
            {t('timesheet.dutyTabList')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'grid' && styles.tabActive]}
          onPress={() => setTab('grid')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'grid' && styles.tabTextActive]}>
            {t('timesheet.dutyTabGrid')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Both mounted-on-demand; each owns its own month/group state. */}
      {tab === 'list' ? <MyDutyScreen embedded /> : <MyDutyGridScreen embedded />}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerCenter: { flex: 1, paddingHorizontal: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    headerSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center' },
    tabActive: { backgroundColor: c.primarySoft, borderColor: c.primaryLight },
    tabText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    tabTextActive: { color: c.primary },
  });
