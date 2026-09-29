// Shared loading / empty / error placeholders, replacing the ~27 hand-rolled
// inline ActivityIndicator + "nothing here" blocks scattered across screens.
// All three centre themselves in the available space and read the theme.
//
// Dizayn «I · Tomchi»: har uchala holatni maskot boshqaradi — yuklanishda
// sakraydi (loading), bo'sh ro'yxatda kutib turadi (idle), xatoda xafa (sad).
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { ff } from '../theme/typography';
import { Icon, type IconName } from './Icon';
import { Tomchi } from './mascot/Tomchi';
import { TomchiLoader } from './mascot/TomchiLoader';
import { ChunkyButton } from './ChunkyButton';

// Full-area loader. Use while a screen's primary query is loading.
export function LoadingView({ label }: { label?: string }) {
  return <TomchiLoader label={label} size={88} />;
}

// Empty-list placeholder. `icon` names what is empty (badge on the mascot).
export function EmptyState({
  title,
  message,
  icon = 'inbox',
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  icon?: IconName;
  /** Optional one-tap way out (e.g. "clear filters" when a filtered list is empty). */
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.center}>
      <View>
        <Tomchi mood="idle" size={92} />
        <View style={styles.badge}>
          <Icon name={icon} size={16} color={colors.textMuted} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.dim}>{message}</Text>}
      {!!onAction && !!actionLabel && (
        <ChunkyButton
          label={actionLabel}
          onPress={onAction}
          variant="outline"
          style={styles.action}
          testID="empty-action"
        />
      )}
    </View>
  );
}

// Error placeholder with an optional retry action (wire to react-query refetch).
export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Tomchi mood="sad" size={92} />
      <Text style={styles.title}>{title ?? t('errors.generic')}</Text>
      {!!message && <Text style={styles.dim}>{message}</Text>}
      {!!onRetry && (
        <ChunkyButton label={t('common.retry')} onPress={onRetry} style={styles.action} />
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
    badge: {
      position: 'absolute',
      right: -2,
      bottom: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 2,
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 17, color: c.text, textAlign: 'center', ...ff('900') },
    dim: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20, ...ff('700') },
    action: { marginTop: 10, minWidth: 180 },
  });
