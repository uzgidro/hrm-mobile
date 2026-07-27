import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';

// The sticky action bar. Sign and reject are INDEPENDENT — the screen passes a
// handler only for the actions the current user may take (sign is gated by
// canSignLetter, reject by the server flag available_actions.can_reject), so a
// trip signer who may reject but not sign still gets a reject button.
export function LetterActionBar({
  busy,
  onSign,
  onReject,
}: {
  busy: boolean;
  onSign?: () => void;
  onReject?: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.actionBar}>
      {onReject && (
        <TouchableOpacity style={[styles.actBtn, styles.actReject]} disabled={busy} onPress={onReject} activeOpacity={0.85}>
          <Text style={styles.actRejectText}>{t('letters.reject')}</Text>
        </TouchableOpacity>
      )}
      {onSign && (
        <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={onSign} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actApproveText}>{t('letters.sign')}</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    actionBar: {
      position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10,
      padding: 16, paddingBottom: 28, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.cardBorder,
    },
    actBtn: { flex: 1, paddingVertical: 15, borderRadius: 13, alignItems: 'center' },
    actApprove: { backgroundColor: c.primary },
    actApproveText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
    actReject: { backgroundColor: c.errorSoft, borderWidth: 1, borderColor: c.error },
    actRejectText: { color: c.error, fontSize: 15, fontWeight: '700' },
  });
