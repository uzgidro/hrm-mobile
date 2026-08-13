import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import MyDutyScreen from './MyDutyScreen';
import MyDutyGridScreen from './MyDutyGridScreen';

type DutyTab = 'list' | 'grid';

// Single "Navbatchilik" entry (web parity — the web has one Navbatchilik page
// hosting both the list and the grid). Owns the Screen shell + header + the
// list/grid switcher; each child renders body-only via its `embedded` prop.
// The old separate /navbatchilik-grid route still resolves for deep links.
export default function NavbatchilikScreen() {
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<DutyTab>('list');

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('timesheet.dutyTitle')}
        subtitle={tab === 'list' ? t('timesheet.dutySubtitle') : t('timesheet.dutyGridSubtitle')}
      />

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
    tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center' },
    tabActive: { backgroundColor: c.primarySoft, borderColor: c.primaryLight },
    tabText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    tabTextActive: { color: c.primary },
  });
