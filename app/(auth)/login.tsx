import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Modal, Pressable, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
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
import { Button } from '../../src/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, radii, shadow } from '../../src/theme/tokens';
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
  // Inline error under the form — the OS Alert showed NOTHING on web, so a
  // wrong password there looked like a dead button.
  const [formError, setFormError] = useState<string | null>(null);
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
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const language = useLangStore((s) => s.language);
  const setLanguage = useLangStore((s) => s.setLanguage);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setFormError(t('auth.credentialsRequired'));
      return;
    }
    if (captcha && !captchaAnswer.trim()) {
      setFormError(t('auth.captchaRequired'));
      return;
    }
    setFormError(null);
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
        setFormError(t('auth.captchaRequired'));
      } else if (code === 'captcha_invalid') {
        setFormError(t('auth.captchaInvalid'));
      } else if (code === 'too_many_login_attempts') {
        setFormError(t('auth.tooManyAttempts'));
      } else if (code === 'invalid_credentials') {
        setFormError(t('auth.invalidCredentials'));
      } else {
        const detail = data?.detail;
        const msg = Array.isArray(detail) ? detail[0]?.msg : (detail || t('auth.invalidCredentials'));
        setFormError(typeof msg === 'string' ? msg : t('errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOneId = async () => {
    setFormError(null);
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
      setFormError(t('auth.oneIdError'));
    } finally {
      setLoading(false);
    }
  };

  const mood = moodForLogin({ focused, passwordVisible: showPass, result });

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
          <LinearGradient
            colors={[...(isDark ? gradients.heroDark : gradients.hero)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Tomchi mood={mood} lookX={focused === 'username' ? caretRatio(username) : 0.5} size={132} />
            <View style={styles.bubble} accessibilityLiveRegion="polite">
              <View style={styles.bubbleTail} />
              <Text style={styles.bubbleText}>{t(BUBBLE_KEY[mood])}</Text>
            </View>
          </LinearGradient>

          <Text style={styles.appName}>{t('auth.appName')}</Text>
          <Text style={styles.appSubtitle}>{t('auth.appSubtitle')}</Text>

          <View style={[styles.form, shadow('md', colors)]} testID="login-card">
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>{t('auth.usernameLabel').toLocaleUpperCase()}</Text>
              <TextInput
                style={[styles.input, focused === 'username' && styles.inputFocused]}
                value={username}
                onChangeText={(v) => { setUsername(v); setResult(null); setFormError(null); }}
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
                  onChangeText={(v) => { setPassword(v); setResult(null); setFormError(null); }}
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
                  onChangeText={(v) => { setCaptchaAnswer(v); setFormError(null); }}
                  placeholder={t('auth.captchaPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                />
                <Text style={styles.captchaHint}>{t('auth.captchaHint')}</Text>
              </View>
            )}

            {!!formError && (
              <View style={styles.formError} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="login-error">
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <Button
              label={t('auth.loginButton')}
              onPress={handleLogin}
              loading={loading}
              size="lg"
              full
              style={styles.loginBtn}
              testID="login-submit"
            />

            {/* OneID (YaIT) SSO — native only; the web SPA has its own OneID flow. */}
            {Platform.OS !== 'web' && (
              <Button
                label={t('auth.oneIdButton')}
                onPress={handleOneId}
                disabled={loading}
                variant="soft"
                size="lg"
                full
                icon="idcard"
                testID="login-oneid"
              />
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.version}>O&apos;zbekgidroenergo · v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
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
    scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, width: '100%', maxWidth: 480, alignSelf: 'center' },

    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logo: { width: 44, height: 44, borderRadius: radii.sm },
    langButton: {
      flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14,
      borderRadius: radii.pill, backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    },
    langButtonText: { fontSize: 13, letterSpacing: 0.6, color: c.fgMuted, ...ff('700', 'text') },

    // Dropdown menu.
    langBackdrop: { flex: 1, backgroundColor: c.overlay, paddingTop: 60, paddingHorizontal: 16, alignItems: 'flex-end' },
    langMenu: {
      backgroundColor: c.elevated, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
      paddingVertical: 6, minWidth: 210,
    },
    langItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
    langItemActive: { backgroundColor: c.brandSoft },
    langItemText: { flex: 1, fontSize: 15, color: c.fg, ...ff('500', 'text') },
    langItemTextActive: { color: c.brandStrong, ...ff('700', 'text') },

    // Binafsha→tomchi hero (v2 grad-hero) ichida Tomchi va gap pufagi.
    hero: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 18,
      borderRadius: radii.xl, paddingHorizontal: 14, paddingTop: 16, overflow: 'hidden',
    },
    bubble: {
      flex: 1, marginBottom: 36, borderRadius: radii.lg,
      paddingVertical: 12, paddingHorizontal: 14, backgroundColor: c.surface,
    },
    // Rotated square peeking out of the bubble's left edge, toward Tomchi.
    bubbleTail: {
      position: 'absolute', left: -6, bottom: 16, width: 14, height: 14, backgroundColor: c.surface,
      transform: [{ rotate: '45deg' }],
    },
    bubbleText: { fontSize: 15, lineHeight: 20, color: c.fg, ...ff('700') },

    appName: { fontSize: 28, letterSpacing: -0.4, color: c.fg, marginTop: 18, ...ff('900') },
    appSubtitle: { fontSize: 15, color: c.fgMuted, marginTop: 2, ...ff('400', 'text') },

    form: {
      gap: 14, marginTop: 18, padding: 16, borderRadius: radii.xl,
      backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    },
    inputWrapper: { gap: 6 },
    label: { fontSize: 12, letterSpacing: 0.6, color: c.fgSubtle, ...ff('600', 'text') },
    input: {
      height: 50, backgroundColor: c.surface2, borderWidth: 1.5, borderColor: c.surface2, borderRadius: radii.md,
      paddingHorizontal: 14, fontSize: 16, color: c.fg, ...NO_WEB_OUTLINE, ...ff('500', 'text'),
    },
    inputFocused: { borderColor: c.brand, backgroundColor: c.surface },
    passwordBox: {
      height: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface2,
      borderWidth: 1.5, borderColor: c.surface2, borderRadius: radii.md, paddingLeft: 14,
    },
    passwordInput: { flex: 1, height: '100%', fontSize: 16, color: c.fg, ...NO_WEB_OUTLINE, ...ff('500', 'text') },
    eyeBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

    captchaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    // The PNG is 168×56; keep its aspect so the glyphs stay readable. Oq fon —
    // captcha rasmi mavzu bilan ag'darilmaydi (v2 `on-white` yuzasi).
    captchaImage: { flex: 1, height: 50, borderRadius: radii.md, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.border },
    captchaRefresh: {
      width: 50, height: 50, borderRadius: radii.md, backgroundColor: c.surface2,
      alignItems: 'center', justifyContent: 'center',
    },
    captchaInput: { letterSpacing: 4, textTransform: 'uppercase' },
    captchaHint: { fontSize: 12, color: c.fgSubtle, ...ff('400', 'text') },
    formError: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12 },
    formErrorText: { flex: 1, fontSize: 13, lineHeight: 18, color: c.danger, ...ff('600', 'text') },

    loginBtn: { marginTop: 6 },

    footer: { marginTop: 'auto', paddingTop: 28, alignItems: 'center' },
    version: { color: c.fgSubtle, fontSize: 12, ...ff('500', 'text') },
  });
