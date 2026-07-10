import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { DecreePermissions } from '@/utils/orderStatus';

// The bottom action bar of the decree detail. Which buttons appear is decided
// entirely by `perms` (from decreePermissions — the web-parity gating); the
// screen passes the workflow callbacks. `busy` disables + shows a spinner.
export function DecreeActionBar({
  perms, busy, onApprove, onReject, onResubmit, onForward, onAcknowledge, onRegister,
}: {
  perms: DecreePermissions;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onResubmit: () => void;
  onForward: () => void;
  onAcknowledge: () => void;
  onRegister: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  if (!perms.hasActions) return null;

  return (
    <View style={styles.actionBar}>
      {perms.canApprove && (
        <>
          <TouchableOpacity style={[styles.actBtn, styles.actReject]} disabled={busy} onPress={onReject} activeOpacity={0.85}>
            <Text style={styles.actRejectText}>{t('orders.actionRequestChange')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={onApprove} activeOpacity={0.85}>
            {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actApproveText}>{t('orders.actionApprove')}</Text>}
          </TouchableOpacity>
        </>
      )}
      {perms.canResubmit && (
        <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={onResubmit} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actApproveText}>{t('orders.actionResubmit')}</Text>}
        </TouchableOpacity>
      )}
      {perms.canForward && (
        <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={onForward} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actApproveText}>{t('orders.actionForward')}</Text>}
        </TouchableOpacity>
      )}
      {perms.canRegister && (
        <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={onRegister} activeOpacity={0.85}>
          <Text style={styles.actApproveText}>{t('orders.actionRegister')}</Text>
        </TouchableOpacity>
      )}
      {perms.canAcknowledge && (
        <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={onAcknowledge} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actApproveText}>{t('orders.actionAcknowledge')}</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    actionBar: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28,
      backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.cardBorder,
    },
    actBtn: { flex: 1, paddingVertical: 15, borderRadius: 13, alignItems: 'center' },
    actApprove: { backgroundColor: c.primary },
    actApproveText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
    actReject: { backgroundColor: c.errorSoft, borderWidth: 1, borderColor: c.error },
    actRejectText: { color: c.error, fontSize: 15, fontWeight: '700' },
  });
