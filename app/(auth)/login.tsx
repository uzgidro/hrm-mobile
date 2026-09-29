import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert, Modal, Pressable, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { getRunningOtaInfo } from '@/services/otaUpdates';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useLangStore } from '../../src/store/langStore';
import { setupPushNotifications } from '../../src/auth/push';
import { loginWithOneId } from '../../src/auth/oneid';
import { AUTH_LOGIN, AUTH_CAPTCHA, USER_INFO } from '../../src/api/urls';
import { useTheme, useThemedStyles } from '../../src/theme/ThemeProvider';
import type { ThemeColors } from '../../src/theme/palettes';
import { ff } from '../../src/theme/typography';
import { NO_WEB_OUTLINE } from '../../src/theme/web';
import { Icon } from '../../src/components/Icon';
import { Flag } from '../../src/components/Flag';
import { ChunkyButton } from '../../src/components/ChunkyButton';
import { Tomchi } from '../../src/ui/mascot/Tomchi';
import { caretRatio, moodForLogin, type TomchiMood } from '../../src/ui/mascot/tomchiPose';
import { LANGUAGES, LANGUAGE_FLAG, LANGUAGE_NATIVE_NAME } from '../../src/i18n/locales';
import { User } from '../../src/types';

// Tomchi's speech bubble line for each mood ('loading' never shows here).
const BUBBLE_KEY: Record<TomchiMood, string> = {
  idle: 'auth.tomchiIdle',
  watching: 'auth.tomchiWatching',
  shy: 'auth.tomchiShy',
  peek: 'auth.tomchiPeek',
  sad: 'auth.tomchiSad',
  happy: 'auth.tomchiHappy',
  loading: 'auth.tomchiIdle',
};

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  // Tomchi maskoti: qaysi maydon fokusda va oxirgi urinish natijasi. Xato
  // foydalanuvchi yana yoza boshlaganda o'chadi (maskot xafa turib qolmaydi).
  const [focused, setFocused] = useState<'username' | 'password' | null>(null);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  // Adaptive CAPTCHA (self-hosted on the API, core/captcha.py). Nobody sees it
  // on a clean login; after a few wrong passwords the server answers 401 with
  // `params.captcha_required` (or the code `captcha_required`) and from then
  // on every attempt carries a solved image. Each image is single-use, so a
  // failed attempt always fetches a fresh one.
  const [captcha, setCaptcha] = useState<{ id: string; image: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaBusy, setCaptchaBusy] = useState(false);
  const { login } = useAuthStore();

  const loadCaptcha = async () => {
    setCaptchaBusy(true);
    setCaptchaAnswer('');
    try {
      const { data } = await apiClient.get<{ captcha_id: string; image: string }>(AUTH_CAPTCHA);
      setCaptcha({ id: data.captcha_id, image: data.image });
    } catch {
      setCaptcha(null);
    } finally {
      setCaptchaBusy(false);
    }
  };
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const language = useLangStore((s) => s.language);
  const setLanguage = useLangStore((s) => s.setLanguage);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(t('common.errorTitle'), t('auth.credentialsRequired'));
      return;
    }
    if (captcha && !captchaAnswer.trim()) {
      Alert.alert(t('common.errorTitle'), t('auth.captchaRequired'));
      return;
    }
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username.trim());
      formData.append('password', password.trim());
      if (captcha) {
        formData.append('captcha_id', captcha.id);
        formData.append('captcha_answer', captchaAnswer.trim());
      }

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
      setResult('success');
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
      setResult('error');
      const err = e as {
        response?: { data?: { detail?: string | { msg: string }[]; code?: string; params?: { captcha_required?: boolean } } };
      };
      const data = err?.response?.data;
      const code = data?.code;
      if (code === 'captcha_required' || code === 'captcha_invalid' || data?.params?.captcha_required) {
        // The previous image was consumed by this attempt — always a fresh one.
        void loadCaptcha();
      }
      if (code === 'captcha_required') {
        Alert.alert(t('auth.loginError'), t('auth.captchaRequired'));
      } else if (code === 'captcha_invalid') {
        Alert.alert(t('auth.loginError'), t('auth.captchaInvalid'));
      } else if (code === 'too_many_login_attempts') {
        Alert.alert(t('auth.loginError'), t('auth.tooManyAttempts'));
      } else if (code === 'invalid_credentials') {
        Alert.alert(t('auth.loginError'), t('auth.invalidCredentials'));
      } else {
        const detail = data?.detail;
        const msg = Array.isArray(detail) ? detail[0]?.msg : (detail || t('auth.invalidCredentials'));
        Alert.alert(t('auth.loginError'), typeof msg === 'string' ? msg : t('errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOneId = async () => {
    setLoading(true);
    try {
      const res = await loginWithOneId();
      // null = the user cancelled the browser; no error, just re-enable.
      if (!res) return;
      // Same seam as the form login: login() flips isAuthenticated and the
      // Stack.Protected guard navigates; then register the push token.
      setResult('success');
      await login(res.access_token, res.refresh_token, res.user);
      void setupPushNotifications();
    } catch {
      setResult('error');
      Alert.alert(t('auth.loginError'), t('auth.oneIdError'));
    } finally {
      setLoading(false);
    }
  };

  const mood = moodForLogin({ focused, passwordVisible: showPass, result });
  const ota = getRunningOtaInfo();
  const otaLabel =
    ota.kind === 'ota'
      ? t('ota.otaBuild', { date: ota.date ?? '', id: ota.shortId ?? '' })
      : t('ota.embeddedBuild');

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo + language chip. The login screen is the first thing a user
              sees, before the profile switcher is reachable; tapping the chip
              opens the 4-language list. */}
          <View style={styles.topBar}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} accessibilityLabel={t('auth.appName')} />
            <TouchableOpacity style={styles.langButton} onPress={() => setLangOpen(true)} activeOpacity={0.7}>
              <Flag code={LANGUAGE_FLAG[language]} size={20} />
              <Text style={styles.langButtonText}>{LANGUAGE_NATIVE_NAME[language].toLocaleUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* Tomchi follows the form: watches the username caret, covers its
              eyes over a hidden password, peeks when it is shown. */}
          <View style={styles.hero}>
            <Tomchi mood={mood} lookX={focused === 'username' ? caretRatio(username) : 0.5} size={132} />
            <View style={styles.bubble} accessibilityLiveRegion="polite">
              <View style={styles.bubbleTail} />
              <Text style={styles.bubbleText}>{t(BUBBLE_KEY[mood])}</Text>
            </View>
          </View>

          <Text style={styles.appName}>{t('auth.appName')}</Text>
          <Text style={styles.appSubtitle}>{t('auth.appSubtitle')}</Text>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>{t('auth.usernameLabel').toLocaleUpperCase()}</Text>
              <TextInput
                style={[styles.input, focused === 'username' && styles.inputFocused]}
                value={username}
                onChangeText={(v) => { setUsername(v); setResult(null); }}
                onFocus={() => setFocused('username')}
                onBlur={() => setFocused(null)}
                placeholder={t('auth.usernamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                testID="login-username"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>{t('auth.passwordLabel').toLocaleUpperCase()}</Text>
              <View style={[styles.passwordBox, focused === 'password' && styles.inputFocused]}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setResult(null); }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  testID="login-password"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)} accessibilityRole="button">
                  <Icon name={showPass ? 'eyeOff' : 'eye'} size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {captcha && (
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>{t('auth.captchaLabel').toLocaleUpperCase()}</Text>
                <View style={styles.captchaRow}>
                  <Image
                    source={{ uri: captcha.image }}
                    style={styles.captchaImage}
                    resizeMode="contain"
                    accessibilityLabel={t('auth.captchaLabel')}
                  />
                  <TouchableOpacity
                    style={styles.captchaRefresh}
                    onPress={loadCaptcha}
                    disabled={captchaBusy}
                    accessibilityLabel={t('auth.captchaRefresh')}
                  >
                    {captchaBusy ? <ActivityIndicator color={colors.textMuted} /> : <Icon name="refresh" size={20} color={colors.textMuted} />}
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, styles.captchaInput]}
                  value={captchaAnswer}
                  onChangeText={setCaptchaAnswer}
                  placeholder={t('auth.captchaPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                />
                <Text style={styles.captchaHint}>{t('auth.captchaHint')}</Text>
              </View>
            )}

            <ChunkyButton
              label={t('auth.loginButton')}
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
              testID="login-submit"
            />

            {/* OneID (YaIT) SSO — native only; the web SPA has its own OneID flow. */}
            {Platform.OS !== 'web' && (
              <ChunkyButton
                label={t('auth.oneIdButton')}
                onPress={handleOneId}
                disabled={loading}
                variant="outline"
                icon="idcard"
                testID="login-oneid"
              />
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.version}>O&apos;zbekgidroenergo · v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
            <Text style={styles.otaBuild}>{otaLabel}</Text>
          </View>
        </ScrollView>
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
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },

    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logo: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: c.cardBorder },
    langButton: {
      flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 12,
      borderRadius: 12, borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder,
    },
    langButtonText: { fontSize: 13, letterSpacing: 0.6, color: c.textSecondary, ...ff('900') },

    // Dropdown menu.
    langBackdrop: { flex: 1, backgroundColor: c.overlay, paddingTop: 60, paddingHorizontal: 16, alignItems: 'flex-end' },
    langMenu: {
      backgroundColor: c.cardElevated, borderRadius: 16, borderWidth: 2, borderColor: c.cardBorder,
      paddingVertical: 6, minWidth: 210,
    },
    langItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
    langItemActive: { backgroundColor: c.primarySoft },
    langItemText: { flex: 1, fontSize: 15, color: c.text, ...ff('700') },
    langItemTextActive: { color: c.primaryLight, ...ff('900') },

    hero: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 18 },
    bubble: {
      flex: 1, marginBottom: 36, borderRadius: 16, borderWidth: 2, borderColor: c.cardBorder,
      paddingVertical: 12, paddingHorizontal: 14, backgroundColor: c.bg,
    },
    // Rotated square peeking out of the bubble's left edge, toward Tomchi.
    bubbleTail: {
      position: 'absolute', left: -8, bottom: 16, width: 14, height: 14, backgroundColor: c.bg,
      borderLeftWidth: 2, borderBottomWidth: 2, borderColor: c.cardBorder, transform: [{ rotate: '45deg' }],
    },
    bubbleText: { fontSize: 15, lineHeight: 20, color: c.text, ...ff('700') },

    appName: { fontSize: 30, letterSpacing: -0.4, color: c.text, marginTop: 14, ...ff('900') },
    appSubtitle: { fontSize: 15, color: c.textSecondary, marginTop: 2, ...ff('700') },

    form: { gap: 14, marginTop: 22 },
    inputWrapper: { gap: 6 },
    label: { fontSize: 13, letterSpacing: 0.6, color: c.textSecondary, ...ff('900') },
    input: {
      height: 52, backgroundColor: c.inputBg, borderWidth: 2, borderColor: c.cardBorder, borderRadius: 16,
      paddingHorizontal: 16, fontSize: 16, color: c.text, ...NO_WEB_OUTLINE, ...ff('700'),
    },
    inputFocused: { borderColor: c.primaryLight },
    passwordBox: {
      height: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg,
      borderWidth: 2, borderColor: c.cardBorder, borderRadius: 16, paddingLeft: 16,
    },
    passwordInput: { flex: 1, height: '100%', fontSize: 16, color: c.text, ...NO_WEB_OUTLINE, ...ff('700') },
    eyeBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

    captchaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    // The PNG is 168×56; keep its aspect so the glyphs stay readable.
    captchaImage: { flex: 1, height: 52, borderRadius: 16, backgroundColor: '#F5F7FA', borderWidth: 2, borderColor: c.cardBorder },
    captchaRefresh: {
      width: 52, height: 52, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: c.cardBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    captchaInput: { letterSpacing: 4, textTransform: 'uppercase' },
    captchaHint: { fontSize: 12, color: c.textMuted, ...ff('600') },

    loginBtn: { marginTop: 8 },

    footer: { marginTop: 'auto', paddingTop: 28, alignItems: 'center' },
    version: { color: c.textMuted, fontSize: 12, ...ff('700') },
    otaBuild: { color: c.textMuted, fontSize: 11, marginTop: 2, ...ff('600') },
  });
