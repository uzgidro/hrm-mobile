import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';

// The sticky sign/reject bar shown only when the current user may act on the
// letter (gating done by the screen via canSignLetter).
export function LetterActionBar({
  busy,
  onSign,
  onReject,
}: {
  busy: boolean;
  onSign: () => void;
  onReject: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.actionBar}>
      <TouchableOpacity style={[styles.actBtn, styles.actReject]} disabled={busy} onPress={onReject} activeOpacity={0.85}>
        <Text style={styles.actRejectText}>{t('letters.reject')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actBtn, styles.actApprove]} disabled={busy} onPress={onSign} activeOpacity={0.85}>
        {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.actApproveText}>{t('letters.sign')}</Text>}
      </TouchableOpacity>
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
