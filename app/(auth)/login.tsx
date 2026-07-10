import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useLangStore } from '../../src/store/langStore';
import { setupPushNotifications } from '../../src/auth/push';
import { AUTH_LOGIN, USER_INFO } from '../../src/api/urls';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import { Icon } from '../../src/components/Icon';
import { Flag } from '../../src/components/Flag';
import { LANGUAGES, LANGUAGE_FLAG, LANGUAGE_NATIVE_NAME } from '../../src/i18n/locales';
import { User } from '../../src/types';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { login } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const language = useLangStore((s) => s.language);
  const setLanguage = useLangStore((s) => s.setLanguage);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(t('auth.errorTitle'), t('auth.credentialsRequired'));
      return;
    }
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username.trim());
      formData.append('password', password.trim());

      const { data } = await apiClient.post(AUTH_LOGIN, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'device-name': 'HRM Mobile',
          'device-type': 'mobile',
        },
      });
      const meRes = await apiClient.get<User>(USER_INFO, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      // login() sets isAuthenticated → the Stack.Protected guard in the root
      // layout redirects to (tabs) automatically; no imperative navigation.
      await login(data.access_token, data.refresh_token, meRes.data);
      // Ask for notification permission right after the FIRST successful login.
      // The bootstrap path (returning user, saved token) already calls this, but a
      // fresh form login doesn't go through resolveBootstrap — without this the OS
      // prompt only appeared on the second launch. Best-effort and fully guarded:
      // never blocks or breaks the login flow.
      void setupPushNotifications();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string | Array<{ msg: string }> } } };
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.msg : (detail || t('auth.invalidCredentials'));
      Alert.alert(t('auth.loginError'), typeof msg === 'string' ? msg : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Language dropdown up top: the login screen is the first thing a user
          sees, before the profile switcher is reachable. A single compact chip
          keeps it out of the way; tapping opens the 4-language list. */}
      <SafeAreaView edges={['top']}>
        <View style={styles.langBar}>
          <TouchableOpacity
            style={styles.langButton}
            onPress={() => setLangOpen(true)}
            activeOpacity={0.7}
          >
            <Flag code={LANGUAGE_FLAG[language]} size={20} />
            <Text style={styles.langButtonText}>{LANGUAGE_NATIVE_NAME[language]}</Text>
            <Icon name="chevronRight" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={styles.langBackdrop} onPress={() => setLangOpen(false)}>
          <View style={styles.langMenu}>
            {LANGUAGES.map((lang) => {
              const active = language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langItem, active && styles.langItemActive]}
                  onPress={() => { setLanguage(lang); setLangOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Flag code={LANGUAGE_FLAG[lang]} size={22} />
                  <Text style={[styles.langItemText, active && styles.langItemTextActive]}>
                    {LANGUAGE_NATIVE_NAME[lang]}
                  </Text>
                  {active && <Icon name="check" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
      <View style={styles.inner}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>HR</Text>
          </View>
          <Text style={styles.appName}>{t('auth.appName')}</Text>
          <Text style={styles.appSubtitle}>{t('auth.appSubtitle')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{t('auth.usernameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder={t('auth.usernamePlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{t('auth.passwordLabel')}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                <Icon name={showPass ? 'eyeOff' : 'eye'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>{t('auth.loginButton')}</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

    // Compact language chip (top-right) that opens the dropdown.
    langBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
    langButton: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 7, paddingLeft: 10, paddingRight: 8, borderRadius: 10,
      borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card,
    },
    langButtonText: { fontSize: 13, fontWeight: '600', color: c.text },

    // Dropdown menu.
    langBackdrop: { flex: 1, backgroundColor: c.overlay, paddingTop: 60, paddingHorizontal: 16, alignItems: 'flex-end' },
    langMenu: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
      paddingVertical: 6, minWidth: 200, shadowColor: c.shadow, shadowOpacity: 0.2,
      shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    langItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
    langItemActive: { backgroundColor: c.primarySoft },
    langItemText: { flex: 1, fontSize: 15, fontWeight: '500', color: c.text },
    langItemTextActive: { color: c.primary, fontWeight: '700' },

    logoWrapper: { alignItems: 'center', marginBottom: 48 },
    logoCircle: { width: 84, height: 84, borderRadius: 26, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    logoText: { fontSize: 30, fontWeight: '800', color: '#fff' },
    appName: { fontSize: 23, fontWeight: '800', color: c.text, marginBottom: 4 },
    appSubtitle: { fontSize: 13, color: c.textSecondary },

    form: { gap: 16 },
    inputWrapper: { gap: 8 },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    input: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: c.text, marginBottom: 0,
    },
    passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn: { width: 52, height: 52, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    eyeText: { fontSize: 18 },

    loginBtn: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    loginBtnDisabled: { opacity: 0.7 },
    loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    version: { textAlign: 'center', color: c.textMuted, fontSize: 12, marginTop: 32 },
  });
