import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Image, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS } from '../../src/constants';

const MENU_ITEMS = [
  { key: 'settings', emoji: '⚙️', label: 'Sozlamalar' },
  { key: 'security', emoji: '🔒', label: 'Xavfsizlik' },
  { key: 'help', emoji: '🎧', label: 'Yordam' },
];

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const employee = user?.employee;
  const [onlySubordinates, setOnlySubordinates] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Chiqish',
      'Tizimdan chiqishni xohlaysizmi?',
      [
        { text: 'Bekor', style: 'cancel' },
        {
          text: 'Ha, chiqish', style: 'destructive', onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Profil</Text>

        {/* User card */}
        <View style={styles.card}>
          <View style={styles.userRow}>
            <View style={styles.avatarWrapper}>
              {employee?.photo_path ? (
                <Image source={{ uri: employee.photo_path }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>
                    {(employee?.legal_name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.userName}>{employee?.legal_name || 'Foydalanuvchi'}</Text>
          </View>
          <View style={styles.userActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/profile-detail')}
            >
              <Text style={styles.actionBtnEmoji}>🪪</Text>
              <Text style={styles.actionBtnText}>Ma'lumotlar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]}>
              <Text style={styles.actionBtnPrimaryText}>O'zgartirish {'>'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Organization */}
        <View style={styles.card}>
          <View style={styles.orgRow}>
            <View style={styles.orgIcon}>
              <Text style={styles.orgIconEmoji}>🏢</Text>
            </View>
            <View style={styles.orgInfo}>
              <Text style={styles.orgName}>
                {employee?.department?.name || 'Tashkilot'}
              </Text>
              <Text style={styles.orgBranch}>
                {employee?.organization_branches?.[0]?.name || 'Joriy filial'}
              </Text>
            </View>
          </View>
        </View>

        {/* Settings menu */}
        <View style={styles.card}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, idx < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuEmoji}>{item.emoji}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Text style={styles.menuArrow}>{'>'}</Text>
            </TouchableOpacity>
          ))}

          {/* Subordinates toggle */}
          <View style={[styles.menuItem, styles.menuItemBorder]}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuEmoji}>👤</Text>
              <Text style={styles.menuLabel}>Faqat bo'ysunuvchilarni</Text>
            </View>
            <Switch
              value={onlySubordinates}
              onValueChange={setOnlySubordinates}
              trackColor={{ false: COLORS.cardBorder, true: COLORS.primary + '88' }}
              thumbColor={onlySubordinates ? COLORS.primaryLight : COLORS.textMuted}
            />
          </View>

          {/* Language */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuEmoji}>Aa</Text>
              <Text style={styles.menuLabel}>Til</Text>
            </View>
            <Text style={styles.menuValue}>O'zbekcha</Text>
          </View>
        </View>

        {/* Position info */}
        {employee?.job_position && (
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lavozim</Text>
              <Text style={styles.infoValue}>{employee.job_position.name}</Text>
            </View>
            {employee.working_hours_start && (
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Ish soati</Text>
                <Text style={styles.infoValue}>
                  {employee.working_hours_start} – {employee.working_hours_end}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Chiqish</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Dastur versiyasi 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, paddingTop: 16, marginBottom: 16 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.cardBorder,
  },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatarWrapper: {},
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: {
    backgroundColor: COLORS.primary + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: COLORS.primaryLight },
  userName: { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1 },

  userActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 11, borderRadius: 10,
    backgroundColor: COLORS.cardBorder,
  },
  actionBtnEmoji: { fontSize: 16 },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  actionBtnPrimary: { backgroundColor: COLORS.primary + '22', borderWidth: 1, borderColor: COLORS.primary + '44' },
  actionBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight },

  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orgIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center',
  },
  orgIconEmoji: { fontSize: 22 },
  orgInfo: { flex: 1 },
  orgName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  orgBranch: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  menuLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  menuArrow: { color: COLORS.textMuted, fontSize: 16 },
  menuValue: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.cardBorder },
  infoLabel: { fontSize: 13, color: COLORS.textMuted },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },

  logoutBtn: {
    backgroundColor: COLORS.absent + '66', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 4, borderWidth: 1, borderColor: COLORS.absent,
  },
  logoutText: { color: '#F87171', fontSize: 16, fontWeight: '700' },

  version: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginTop: 16 },
});
