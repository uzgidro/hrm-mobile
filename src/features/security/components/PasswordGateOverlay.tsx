// The password-rotation gate (2026-09-15) — the LockOverlay pattern applied to
// passwords. `/auth/me` says `password_must_change` when the password is
// older than the server's rotation window (or is an HR-issued temporary one
// while that switch is on); from then on the API answers every other route
// with 403 `password_expired`, so there is nothing else to show. Mounted by
// _layout as a full-screen sibling above the navigator; the only ways out are
// a new password or logging out. A successful change revokes EVERY session on
// the server, so the person is signed out and asked to log in again.
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';
import { AUTH_ME_PASSWORD } from '@/api/urls';
import { getApiErrorMessage } from '@/api/errors';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';
import { checkPassword } from '@/lib/passwordStrength';
import { toast } from '@/lib/toast';

export default function PasswordGateOverlay() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!current.trim()) return setError(t('password.currentRequired'));
    if (checkPassword(next, user?.username).failed.length) return setError(t('password.notStrongEnough'));
    if (next !== confirm) return setError(t('password.mismatch'));
    setBusy(true);
    try {
      await apiClient.patch(AUTH_ME_PASSWORD, {
        current_password: current.trim(),
        password: next,
        password_change_warning: false,
      });
      toast.success(t('password.changedRelogin'));
      await logout();
    } catch (e: unknown) {
      const code = (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'invalid_current_password') setError(t('password.currentWrong'));
      else if (code === 'password_reused') setError(t('password.reused'));
      else if (code === 'weak_password') setError(t('password.notStrongEnough'));
      else setError(getApiErrorMessage(e, t('errors.generic')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.fill, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.badge}>
              <Icon name="lock" size={30} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t('password.mustChangeTitle')}</Text>
            <Text style={styles.subtitle}>
              {user?.password_expired ? t('password.mustChangeExpired') : t('password.mustChangeTemporary')}
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>{t('password.current')}</Text>
              <TextInput
                style={styles.input}
                value={current}
                onChangeText={setCurrent}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                textContentType="password"
              />

              <Text style={styles.label}>{t('password.new')}</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.grow]}
                  value={next}
                  onChangeText={setNext}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  textContentType="newPassword"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShow((v) => !v)} accessibilityLabel={t('password.toggleShow')}>
                  <Icon name={show ? 'eyeOff' : 'eye'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <PasswordStrengthMeter value={next} username={user?.username} />

              <Text style={styles.label}>{t('password.confirm')}</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!show}
                autoCapitalize="none"
                textContentType="newPassword"
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity style={[styles.primaryBtn, busy && styles.disabled]} onPress={submit} disabled={busy} activeOpacity={0.85}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{t('password.save')}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => void logout()} disabled={busy} activeOpacity={0.7}>
                <Icon name="logout" size={16} color={colors.textSecondary} />
                <Text style={styles.ghostBtnText}>{t('password.logout')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    fill: { zIndex: 1000, elevation: 1000 },
    safe: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
    badge: {
      alignSelf: 'center', width: 72, height: 72, borderRadius: 24,
      backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    title: { fontSize: 22, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    form: { gap: 8 },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginTop: 6 },
    input: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: c.text,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    grow: { flex: 1 },
    eyeBtn: {
      width: 52, height: 52, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder,
      borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    },
    error: { color: c.error, fontSize: 13, marginTop: 4 },
    primaryBtn: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.7 },
    ghostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
    ghostBtnText: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
  });
