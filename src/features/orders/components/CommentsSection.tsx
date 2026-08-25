import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { getApiErrorMessage } from '@/api/errors';
import { orderCommentsQuery, orderHistoryQuery } from '../api/queries';
import { useAddOrderComment } from '../api/mutations';
import { Section } from './DetailParts';

// IZOHLAR + MATN TAHRIRI TARIXI — ikkalasi ham webda ko'rinadi, mobilда umuman
// yo'q edi. Izoh yozish buyruqni ko'ra oladigan HAR KIMga ochiq (backend
// `add_order_act_comment`), status o'zgarmaydi. Tarix esa matn qachon va kim
// tomonidan o'zgarganini ko'rsatadi — bu MUHIM, chunki matn tahrirlanganda
// imzolar SAQLANADI (ya'ni imzo "men shu matnni ko'rdim" degani emas).
export function CommentsSection({ orderId }: { orderId: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { data: comments = [] } = useQuery(orderCommentsQuery(orderId));
  const { data: history = [] } = useQuery(orderHistoryQuery(orderId));
  const addM = useAddOrderComment(orderId);
  const [text, setText] = useState('');

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addM.mutate(trimmed, {
      onSuccess: () => setText(''),
      onError: (e) =>
        Alert.alert(t('orders.actionError'), getApiErrorMessage(e, t('orders.actionError'))),
    });
  };

  return (
    <>
      <Section title={t('orders.sectionComments')}>
        {comments.length === 0 && (
          <Text style={styles.empty}>{t('orders.commentsEmpty')}</Text>
        )}
        {comments.map((c) => (
          <View key={c.id} style={styles.row}>
            <View style={styles.rowHead}>
              <Text style={styles.author} numberOfLines={1}>
                {c.employee?.legal_name ?? t('status.unknown')}
              </Text>
              {!!c.created_at && (
                <Text style={styles.date}>{dayjs(c.created_at).format('DD.MM.YYYY HH:mm')}</Text>
              )}
            </View>
            {!!c.text && <Text style={styles.text}>{c.text}</Text>}
          </View>
        ))}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('orders.commentPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            testID="order-comment-input"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || addM.isPending) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!text.trim() || addM.isPending}
            activeOpacity={0.85}
            testID="order-comment-send"
          >
            {addM.isPending
              ? <ActivityIndicator size="small" color={colors.onPrimary} />
              : <Text style={styles.sendText}>{t('orders.commentSend')}</Text>}
          </TouchableOpacity>
        </View>
      </Section>

      {history.length > 0 && (
        <Section title={t('orders.sectionEditHistory')}>
          {history.map((h) => (
            <View key={h.id} style={styles.row}>
              <View style={styles.rowHead}>
                <Text style={styles.author} numberOfLines={1}>
                  {h.editor?.legal_name ?? t('status.unknown')}
                </Text>
                {!!h.created_at && (
                  <Text style={styles.date}>{dayjs(h.created_at).format('DD.MM.YYYY HH:mm')}</Text>
                )}
              </View>
              <Text style={styles.historyNote}>{t('orders.editHistoryTextChanged')}</Text>
            </View>
          ))}
        </Section>
      )}
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    empty: { fontSize: 13, color: c.textMuted },
    row: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.cardBorder, gap: 4 },
    rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    author: { fontSize: 13, fontWeight: '700', color: c.text, flexShrink: 1 },
    date: { fontSize: 11, color: c.textMuted },
    text: { fontSize: 13, color: c.text, lineHeight: 19 },
    historyNote: { fontSize: 12, color: c.textMuted },
    composer: { marginTop: 12, gap: 8 },
    input: {
      minHeight: 72, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 10,
      padding: 12, color: c.text, fontSize: 14,
    },
    sendBtn: { alignSelf: 'flex-end', backgroundColor: c.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 11 },
    sendBtnDisabled: { opacity: 0.5 },
    sendText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  });
