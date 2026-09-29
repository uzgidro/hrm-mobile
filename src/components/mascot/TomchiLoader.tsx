// Tomchi bilan to'liq maydonli yuklash holati. LoadingView bilan bir xil
// joylashadi (markazda, bo'sh joyni egallaydi), shuning uchun kerakli ekranda
// <LoadingView/> o'rniga to'g'ridan-to'g'ri qo'yish mumkin. Matn (label)
// chaqiruvchi tomonidan tarjima qilingan holda beriladi.
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { Tomchi } from './Tomchi';

export function TomchiLoader({ label, size = 96 }: { label?: string; size?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={styles.center}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      <Tomchi mood="loading" size={size} />
      {!!label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 24 },
    label: { fontSize: 13.5, color: c.textSecondary, textAlign: 'center', lineHeight: 19, ...ff('700') },
  });

export default TomchiLoader;
