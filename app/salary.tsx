import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { Icon } from '../src/components/Icon';

export default function SalaryScreen() {
  const { colors } = useTheme();
  const s = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('modules.labels.salary')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.body}>
        <View style={s.emptyIconWrap}><Icon name="chart" size={30} color={colors.textMuted} /></View>
        <Text style={s.title}>{t('modules.salary.title')}</Text>
        <Text style={s.subtitle}>{t('modules.salary.description')}</Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    backArrow: { fontSize: 22, color: c.text, fontWeight: '300' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: c.text, paddingLeft: 4 },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
    icon: { fontSize: 64 },
    emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 26, fontWeight: '800', color: c.text },
    subtitle: { fontSize: 15, color: c.textSecondary, textAlign: 'center', lineHeight: 22 },
  });
