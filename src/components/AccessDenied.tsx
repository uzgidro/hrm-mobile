// Shown when a user opens a page their role can't access (mirrors the web,
// where the page simply isn't in their nav). Keeps a back button via ScreenHeader.
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { ScreenHeader } from './ScreenHeader';
import { Icon } from './Icon';

export function AccessDenied({ title }: { title?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={title ?? ''} />
      <View style={styles.center}>
        <View style={styles.iconWrap}><Icon name="lock" size={30} color={colors.textMuted} /></View>
        <Text style={styles.title}>Ruxsat yo'q</Text>
        <Text style={styles.text}>Bu sahifaga kirish huquqingiz yo'q</Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
    iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
    text: { fontSize: 14, color: c.textSecondary },
  });
