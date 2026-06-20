import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { usePrefsStore } from '../../src/store/prefsStore';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import type { ThemeMode } from '../../src/theme/ThemeProvider';

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: string }[] = [
  { key: 'system', label: 'Tizim', icon: '⚙️' },
  { key: 'light', label: "Yorug'", icon: '☀️' },
  { key: 'dark', label: 'Qora', icon: '🌙' },
];

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const employee = user?.employee;
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { onlySubordinates, setOnlySubordinates } = usePrefsStore();

  const handleLogout = () => {
    Alert.alert('Chiqish', 'Tizimdan chiqishni xohlaysizmi?', [
      { text: 'Bekor', style: 'cancel' },
      {
        text: 'Ha, chiqish',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Profil</Text>

        {/* User card */}
        <View style={styles.card}>
          <View style={styles.userRow}>
            {employee?.photo_path ? (
              <Image source={{ uri: employee.photo_path }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {(employee?.legal_name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {employee?.legal_name || 'Foydalanuvchi'}
              </Text>
              {employee?.job_position?.name && (
                <Text style={styles.userRole} numberOfLines={1}>
                  {employee.job_position.name}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.userActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/profile-detail')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnEmoji}>🪪</Text>
              <Text style={styles.actionBtnText}>Ma'lumotnoma</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => router.push('/profile-edit')}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnEmoji}>✏️</Text>
              <Text style={styles.actionBtnPrimaryText}>O'zgartirish</Text>
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
              <Text style={styles.orgName} numberOfLines={1}>
                {employee?.department?.name || 'Tashkilot'}
              </Text>
              <Text style={styles.orgBranch} numberOfLines={1}>
                {employee?.organization_branches?.[0]?.name || 'Joriy filial'}
              </Text>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <Text style={styles.sectionLabel}>Ko'rinish</Text>
        <View style={styles.card}>
          <View style={styles.segmentRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = mode === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => setMode(opt.key)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.segmentIcon}>{opt.icon}</Text>
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>Sozlamalar</Text>
        <View style={styles.card}>
          <View style={[styles.menuItem, styles.menuItemBorder]}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuEmoji}>👥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Faqat bo'ysunuvchilar</Text>
                <Text style={styles.menuHint}>Jamoa va ro'yxatlarda faqat sizga biriktirilganlar</Text>
              </View>
            </View>
            <Switch
              value={onlySubordinates}
              onValueChange={setOnlySubordinates}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={'#fff'}
            />
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuEmoji}>🌐</Text>
              <Text style={styles.menuLabel}>Til</Text>
            </View>
            <Text style={styles.menuValue}>O'zbekcha</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Chiqish</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Dastur versiyasi 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    pageTitle: { fontSize: 26, fontWeight: '800', color: c.text, paddingTop: 16, marginBottom: 16 },

    sectionLabel: {
      fontSize: 12, fontWeight: '700', color: c.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.6,
      marginTop: 8, marginBottom: 8, marginLeft: 4,
    },

    card: {
      backgroundColor: c.card, borderRadius: 18, padding: 16,
      marginBottom: 12, borderWidth: 1, borderColor: c.cardBorder,
    },

    userRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
    avatar: { width: 60, height: 60, borderRadius: 30 },
    avatarFallback: { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 24, fontWeight: '700', color: c.primaryLight },
    userName: { fontSize: 18, fontWeight: '800', color: c.text },
    userRole: { fontSize: 13, color: c.textSecondary, marginTop: 2 },

    userActions: { flexDirection: 'row', gap: 10 },
    actionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 12, borderRadius: 12,
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder,
    },
    actionBtnEmoji: { fontSize: 15 },
    actionBtnText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    actionBtnPrimary: { backgroundColor: c.primary, borderColor: c.primary },
    actionBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: c.onPrimary },

    orgRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    orgIcon: {
      width: 46, height: 46, borderRadius: 13,
      backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center',
    },
    orgIconEmoji: { fontSize: 22 },
    orgInfo: { flex: 1 },
    orgName: { fontSize: 15, fontWeight: '700', color: c.text },
    orgBranch: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    segmentRow: { flexDirection: 'row', gap: 8 },
    segment: {
      flex: 1, alignItems: 'center', gap: 5, paddingVertical: 12, borderRadius: 12,
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder,
    },
    segmentActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    segmentIcon: { fontSize: 18 },
    segmentText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    segmentTextActive: { color: c.primaryLight, fontWeight: '800' },

    menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    menuEmoji: { fontSize: 18, width: 26, textAlign: 'center' },
    menuLabel: { fontSize: 15, color: c.text, fontWeight: '600' },
    menuHint: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    menuValue: { fontSize: 14, color: c.textSecondary, fontWeight: '500' },

    logoutBtn: {
      backgroundColor: c.errorSoft, borderRadius: 14, paddingVertical: 15,
      alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: c.error,
    },
    logoutText: { color: c.error, fontSize: 16, fontWeight: '700' },

    version: { textAlign: 'center', color: c.textMuted, fontSize: 12, marginTop: 16 },
  });
