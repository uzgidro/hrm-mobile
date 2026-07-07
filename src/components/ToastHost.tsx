// Single toast host, mounted once in the root layout above the navigator.
// Subscribes to the imperative toast store and renders the queue as a stack of
// cards near the top of the screen. Uses RN's built-in Animated (no Reanimated)
// for a lightweight fade/slide-in.
import { useSyncExternalStore, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { Icon, type IconName } from './Icon';
import {
  subscribeToasts,
  getToasts,
  dismissToast,
  type Toast,
  type ToastKind,
} from '../lib/toast';

const ICON: Record<ToastKind, IconName> = {
  error: 'close',
  success: 'check',
  info: 'bell',
};

function accentFor(kind: ToastKind, c: ThemeColors): string {
  if (kind === 'error') return c.error;
  if (kind === 'success') return c.success;
  return c.info;
}

function ToastCard({ toast }: { toast: Toast }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // A stable Animated.Value created once (useState initializer runs once); the
  // derived translateY interpolation is memoized so nothing is recomputed or
  // ref-dereferenced during render.
  const [anim] = useState(() => new Animated.Value(0));
  const translateY = useMemo(
    () => anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }),
    [anim]
  );

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [anim]);

  const accent = accentFor(toast.kind, colors);
  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderLeftColor: accent,
          opacity: anim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
        <Icon name={ICON[toast.kind]} size={14} color={accent} />
      </View>
      <Text style={styles.message} numberOfLines={3}>
        {toast.message}
      </Text>
      <Pressable onPress={() => dismissToast(toast.id)} hitSlop={10} style={styles.close}>
        <Icon name="close" size={14} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  if (toasts.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    host: {
      position: 'absolute',
      left: 12,
      right: 12,
      zIndex: 9999,
      gap: 8,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.cardElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderLeftWidth: 3,
      paddingVertical: 10,
      paddingHorizontal: 12,
      shadowColor: c.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    iconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    message: { flex: 1, fontSize: 13.5, lineHeight: 18, color: c.text, fontWeight: '500' },
    close: { padding: 2 },
  });
