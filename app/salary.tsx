import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../src/constants';

export default function SalaryScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Oylik</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.body}>
        <Text style={s.icon}>🚀</Text>
        <Text style={s.title}>Tez orada</Text>
        <Text style={s.subtitle}>
          Oylik ma'lumotlari moduli ishlab chiqilmoqda.{'\n'}Yaqin orada qo'shiladi.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: COLORS.text, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.text, paddingLeft: 4 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  icon: { fontSize: 64 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
});
