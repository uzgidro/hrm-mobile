// "Saqlanmagan qoralama bor" — one shared prompt for every create form that
// autosaves (see `src/lib/formDraft.ts`). Rendered as a dismissable banner
// rather than an Alert so it never fights the screen's own dialogs.
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from './Icon';

export function DraftPrompt({ visible, onRestore, onDiscard }: {
  visible: boolean; onRestore: () => void; onDiscard: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (!visible) return null;
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Icon name="edit" size={18} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t('common.draftFoundTitle')}</Text>
        <Text style={styles.msg}>{t('common.draftFoundMessage')}</Text>
      </View>
      <TouchableOpacity onPress={onRestore} style={styles.btn} activeOpacity={0.8}>
        <Text style={styles.btnText}>{t('common.draftRestore')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDiscard} hitSlop={8} activeOpacity={0.8}>
        <Icon name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 10,
      padding: 12, borderRadius: 12, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primary,
    },
    title: { fontSize: 13, fontWeight: '700', color: c.text },
    msg: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: c.primary },
    btnText: { fontSize: 12, fontWeight: '700', color: c.onPrimary },
  });
