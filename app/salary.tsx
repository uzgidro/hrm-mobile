import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { Icon } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';

export default function SalaryScreen() {
  const { colors } = useTheme();
  const s = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title={t('modules.labels.salary')} />

      <View style={s.body}>
        <View style={s.emptyIconWrap}><Icon name="chart" size={30} color={colors.textMuted} /></View>
        <Text style={s.title}>{t('modules.salary.title')}</Text>
        <Text style={s.subtitle}>{t('modules.salary.description')}</Text>
      </View>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
    icon: { fontSize: 64 },
    emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 26, fontWeight: '800', color: c.text },
    subtitle: { fontSize: 15, color: c.textSecondary, textAlign: 'center', lineHeight: 22 },
  });
