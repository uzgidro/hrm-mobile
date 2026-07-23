import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { Letter } from '@/types';
import { letterStatusMeta, letterTypeLabel, statusColor } from '@/utils/letterStatus';

// One row of the letters list. `action` = the current user's signature is
// pending (derived by the list screen via canSignLetter) which highlights the
// card border + tag. useTranslation() re-renders the util-sourced status/type
// labels on a language switch.
export function LetterListCard({ letter, action }: { letter: Letter; action: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const meta = letterStatusMeta(letter);
  const sc = statusColor(meta.kind, colors);

  return (
    <TouchableOpacity
      style={[styles.card, action && styles.cardAction]}
      onPress={() => router.push({ pathname: '/letter-detail', params: { id: String(letter.id) } })}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardType} numberOfLines={1}>
          {letterTypeLabel(letter.letter_type)}{letter.letter_number ? `  №${letter.letter_number}` : ''}
        </Text>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.badgeText, { color: sc.fg }]}>{meta.label}</Text>
        </View>
      </View>

      {!!letter.description && <Text style={styles.cardDesc} numberOfLines={2}>{letter.description}</Text>}

      <View style={styles.cardMeta}>
        <Text style={styles.cardMetaText} numberOfLines={1}>
          {letter.creator_employee?.legal_name || letter.submitter?.legal_name || ''}
        </Text>
        {!!letter.created_at && <Text style={styles.cardMetaText}>{dayjs(letter.created_at).format('DD.MM.YYYY')}</Text>}
      </View>

      {action && (
        <View style={styles.actionTag}>
          <Text style={styles.actionTagText}>{t('letters.actionPending')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: c.cardBorder, gap: 8 },
    cardAction: { borderColor: c.warning },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    cardType: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    cardDesc: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    cardMetaText: { fontSize: 12, color: c.textMuted, flexShrink: 1 },
    actionTag: { alignSelf: 'flex-start', backgroundColor: c.warningSoft, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
    actionTagText: { fontSize: 11, fontWeight: '700', color: c.warning },
  });
