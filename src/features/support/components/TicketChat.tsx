import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { SupportTicketMessage } from '@/types';
import { Icon } from '@/components/Icon';
import { getApiErrorMessage } from '@/api/errors';
import { ticketMessagesQuery } from '../api/queries';
import { markTicketRead, useSendTicketMessage } from '../api/mutations';

// Ticket YOZISHMASI (AKT ↔ murojaatchi). Backendда 2026-08-16 dan beri bor
// (`support_ticket_messages`), mobilда esa umuman ko'rinmasdi: AKT xodimi
// murojaatchidan tafsilot so'ray olmasdi, murojaatchi javobni ko'rmasdi.
//
// Ekran ochilganda yozishma O'QILGAN deb belgilanadi (ro'yxatdagi o'qilmagan
// soni nolga tushadi), so'ng 20 soniyalik yangilanish ishlaydi.
export function TicketChat({ ticketId }: { ticketId: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [text, setText] = useState('');
  const sendM = useSendTicketMessage(ticketId);
  const marked = useRef(false);

  const { data: messages = [], isLoading } = useQuery(ticketMessagesQuery(ticketId));

  useEffect(() => {
    // Bir marta — ekran ochilganda. Xato bo'lsa jim: o'qilgan belgisi
    // yozishmani ko'rsatishga to'sqinlik qilmasin.
    if (marked.current || !ticketId) return;
    marked.current = true;
    markTicketRead(ticketId).catch(() => {});
  }, [ticketId]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    sendM.mutate(body, {
      onSuccess: () => setText(''),
      onError: (e) =>
        Alert.alert(t('support.actionError'), getApiErrorMessage(e, t('support.actionError'))),
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('support.chatTitle')}</Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginVertical: 14 }} color={colors.primaryLight} />
      ) : messages.length === 0 ? (
        <Text style={styles.empty}>{t('support.chatEmpty')}</Text>
      ) : (
        messages.map((m: SupportTicketMessage) =>
          m.is_system ? (
            <Text key={m.id} style={styles.system}>{m.body}</Text>
          ) : (
            <View key={m.id} style={styles.msg}>
              <View style={styles.msgHead}>
                <Text style={styles.author}>{m.author?.legal_name ?? '—'}</Text>
                <Text style={styles.time}>
                  {m.created_at ? dayjs(m.created_at).format('DD.MM.YYYY HH:mm') : ''}
                </Text>
              </View>
              <Text style={styles.body}>{m.body}</Text>
            </View>
          ),
        )
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('support.chatPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          testID="ticket-chat-input"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sendM.isPending) && styles.sendBtnOff]}
          disabled={!text.trim() || sendM.isPending}
          onPress={send}
          activeOpacity={0.85}
          testID="ticket-chat-send"
        >
          {sendM.isPending
            ? <ActivityIndicator size="small" color={colors.onPrimary} />
            : <Icon name="mail" size={16} color={colors.onPrimary} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.cardBorder, gap: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 2 },
    empty: { fontSize: 13, color: c.textMuted, paddingVertical: 8 },
    system: { fontSize: 12, color: c.textMuted, textAlign: 'center', paddingVertical: 6 },
    msg: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.cardBorder },
    msgHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    author: { fontSize: 13, fontWeight: '600', color: c.text },
    time: { fontSize: 11, color: c.textMuted },
    body: { fontSize: 14, color: c.textSecondary, marginTop: 3, lineHeight: 20 },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 },
    input: {
      flex: 1, minHeight: 42, maxHeight: 120, borderWidth: 1, borderColor: c.cardBorder,
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: c.text, fontSize: 14,
    },
    sendBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    sendBtnOff: { opacity: 0.4 },
  });
