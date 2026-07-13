// Reusable bottom-sheet confirmation dialog, styled like the rest of the app —
// the in-app replacement for the plain OS `Alert.alert(title, msg, [cancel,
// confirm])`. A soft brand/danger circle with an icon, a title, an optional
// message, a filled action button and a quiet cancel button.
//
// Presentational + controlled: the parent owns `visible` and the callbacks.
// `destructive` tints the action button (and icon circle) with the error color
// for irreversible actions (logout, delete). `icon` defaults to a question mark
// glyph when omitted.
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon, type IconName } from '@/components/Icon';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  icon?: IconName;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  icon = 'help',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const accent = destructive ? colors.error : colors.primary;
  const accentSoft = destructive ? colors.errorSoft : colors.primarySoft;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/* Tapping the dimmed backdrop dismisses (same as cancel). */}
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Stop propagation so taps inside the sheet don't dismiss it. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />

          <View style={[styles.iconCircle, { backgroundColor: accentSoft }]}>
            <Icon name={icon} size={32} color={accent} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <TouchableOpacity
            testID="confirm-sheet-confirm"
            style={[styles.confirmBtn, { backgroundColor: accent }]}
            activeOpacity={0.85}
            onPress={onConfirm}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="confirm-sheet-cancel"
            style={styles.cancelBtn}
            activeOpacity={0.6}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 32,
      alignItems: 'center',
    },
    grabber: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.cardBorder,
      marginBottom: 20,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: { fontSize: 19, fontWeight: '800', color: c.text, textAlign: 'center' },
    message: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: 8,
      marginBottom: 24,
    },
    confirmBtn: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    cancelBtn: { paddingVertical: 14, alignItems: 'center', alignSelf: 'stretch', marginTop: 4 },
    cancelText: { color: c.textSecondary, fontSize: 15, fontWeight: '600' },
  });
