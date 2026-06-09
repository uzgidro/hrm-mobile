import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { AUTH_LOGIN, USER_INFO } from '../../src/api/urls';
import { COLORS } from '../../src/constants';
import { User } from '../../src/types';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Xato', 'Login va parol kiritilishi shart');
      return;
    }
    setLoading(true);
    try {
      // OAuth2PasswordRequestForm — form-urlencoded format talab qiladi
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
      await login(data.access_token, data.refresh_token, meRes.data);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string | Array<{msg:string}> } } };
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.msg : (detail || 'Login yoki parol noto\'g\'ri');
      Alert.alert('Kirish xatosi', typeof msg === 'string' ? msg : 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>HR</Text>
          </View>
          <Text style={styles.appName}>Uzgidro HRM</Text>
          <Text style={styles.appSubtitle}>Xodimlar boshqaruv tizimi</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Foydalanuvchi nomi</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Username yoki email"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Parol</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass(!showPass)}
              >
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Kirish</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  logoWrapper: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.primary, alignItems: 'center',
    justifyContent: 'center', marginBottom: 16,
  },
  logoText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  appName: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  appSubtitle: { fontSize: 13, color: COLORS.textSecondary },

  form: { gap: 16 },
  inputWrapper: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: COLORS.text, marginBottom: 0,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: {
    width: 50, height: 50, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  eyeText: { fontSize: 18 },

  loginBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  version: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginTop: 32 },
});
