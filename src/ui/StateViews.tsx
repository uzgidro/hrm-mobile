// Yuklanish / bo'sh / xato holatlari («Tomchi × v2»).
// - LoadingView — skeleton kartalar (ma'lumot zonasi toza, maskot yo'q).
// - EmptyState — Monday naqshi: yumshoq doira ichida Tomchi + sarlavha + izoh.
// - ErrorState — xafa Tomchi + «Qayta urinish».
// Eski API (`icon`, `actionLabel`/`onAction`, `label`) saqlangan — ~35 ta
// mavjud chaqiruv o'zgarishsiz ishlaydi.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import type { IconName } from '@/components/Icon';
import { Tomchi } from './mascot/Tomchi';
import type { TomchiMood } from './mascot/tomchiPose';
import { Text } from './Text';
import { Button } from './Button';
import { Skeleton } from './Skeleton';

export function LoadingView({ label, rows = 3 }: { label?: string; rows?: number }) {
  const { colors: c } = useTheme();
  return (
    <View
      style={styles.loading}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          testID="skeleton-card"
          style={[styles.skelCard, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <Skeleton width="40%" height={14} />
          <Skeleton height={12} />
          <Skeleton width="70%" height={12} />
        </View>
      ))}
    </View>
  );
}

function MascotHalo({ mood }: { mood: TomchiMood }) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.halo, { backgroundColor: c.brandSoft }]}>
      <Tomchi mood={mood} size={84} />
    </View>
  );
}

export function EmptyState({
  title,
  message,
  action,
  actionLabel,
  onAction,
  pose = 'idle',
}: {
  title: string;
  message?: string;
  /** Eski API: endi ishlatilmaydi (maskot bo'shliqni o'zi ifodalaydi). */
  icon?: IconName;
  action?: { label: string; onPress: () => void };
  /** Eski API — `action` bilan bir xil. */
  actionLabel?: string;
  onAction?: () => void;
  pose?: TomchiMood;
}) {
  const act = action ?? (actionLabel && onAction ? { label: actionLabel, onPress: onAction } : undefined);
  return (
    <View style={styles.center}>
      <MascotHalo mood={pose} />
      <Text variant="title" style={styles.title}>
        {title}
      </Text>
      {!!message && (
        <Text variant="body" tone="muted" style={styles.message}>
          {message}
        </Text>
      )}
      {act && (
        <Button label={act.label} onPress={act.onPress} variant="soft" style={styles.action} testID="empty-action" />
      )}
    </View>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <MascotHalo mood="sad" />
      <Text variant="title" style={styles.title}>
        {title ?? t('errors.generic')}
      </Text>
      {!!message && (
        <Text variant="body" tone="muted" style={styles.message}>
          {message}
        </Text>
      )}
      {!!onRetry && <Button label={t('common.retry')} onPress={onRetry} variant="soft" style={styles.action} />}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, padding: 16, gap: 12 },
  skelCard: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  halo: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { textAlign: 'center', fontSize: 18, lineHeight: 24 },
  message: { textAlign: 'center', maxWidth: 320 },
  action: { marginTop: 10, minWidth: 180 },
});
