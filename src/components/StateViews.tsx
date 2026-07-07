// Shared loading / empty / error placeholders, replacing the ~27 hand-rolled
// inline ActivityIndicator + "nothing here" blocks scattered across screens.
// All three centre themselves in the available space and read the theme.
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { Icon, type IconName } from './Icon';

// Full-area spinner. Use while a screen's primary query is loading.
export function LoadingView({ label }: { label?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primaryLight} />
      {!!label && <Text style={styles.dim}>{label}</Text>}
    </View>
  );
}

// Empty-list placeholder. `icon` defaults to the inbox glyph.
export function EmptyState({
  title,
  message,
  icon = 'inbox',
}: {
  title: string;
  message?: string;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.center}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={28} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.dim}>{message}</Text>}
    </View>
  );
}

// Error placeholder with an optional retry action (wire to react-query refetch).
export function ErrorState({
  title = 'Xatolik yuz berdi',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.center}>
      <View style={[styles.iconWrap, { backgroundColor: colors.errorSoft }]}>
        <Icon name="close" size={26} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.dim}>{message}</Text>}
      {!!onRetry && (
        <Pressable onPress={onRetry} style={styles.retry} hitSlop={8}>
          <Text style={styles.retryText}>Qayta urinish</Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 24,
    },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    title: { fontSize: 16, fontWeight: '700', color: c.text, textAlign: 'center' },
    dim: { fontSize: 13.5, color: c.textSecondary, textAlign: 'center', lineHeight: 19 },
    retry: {
      marginTop: 10,
      paddingVertical: 9,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: c.primary,
    },
    retryText: { color: c.onPrimary, fontWeight: '700', fontSize: 14 },
  });
