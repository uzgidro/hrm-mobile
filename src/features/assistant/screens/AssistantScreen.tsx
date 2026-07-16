import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView, ErrorState, EmptyState } from '@/components/StateViews';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import type { LlmMessage } from '@/types';
import { assistantKeys, assistantSessionsQuery, assistantMessagesQuery } from '../api/queries';
import {
  createAssistantSession, deleteAssistantSession,
  streamAssistantMessage, sendAssistantMessage,
} from '../api/mutations';
import { splitLoadMoreMarker, stabilizeStreamText } from '../stream';

// A locally-rendered row: persisted messages come from the query; the pair
// being streamed lives in component state until the post-stream refetch.
type Row = { key: string; role: 'user' | 'assistant'; text: string; streaming?: boolean };

// The LLM assistant chat. Access is CLIENT-gated (canAccessPage 'assistant' —
// stricter than web, no employee-like/KPP); the backend accepts any token.
// v1 renders answers as plain text (markdown arrives but is shown raw except
// the LOAD_MORE marker, which is stripped); full markdown is a later wave.
export default function AssistantScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const qc = useQueryClient();

  const sessionsQ = useQuery(assistantSessionsQuery());
  const sessions = useMemo(() => sessionsQ.data ?? [], [sessionsQ.data]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const activeId = sessionId ?? sessions[0]?.id ?? null;

  const messagesQ = useQuery({ ...assistantMessagesQuery(activeId ?? 0), enabled: !!activeId });

  const [input, setInput] = useState('');
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [streamText, setStreamText] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList<Row>>(null);

  // Abort a live stream when the screen unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const rows: Row[] = useMemo(() => {
    const persisted = (messagesQ.data ?? [])
      .filter((m: LlmMessage) => m.role === 'user' || m.role === 'assistant')
      .map((m: LlmMessage) => ({
        key: `m-${m.id}`,
        role: m.role as 'user' | 'assistant',
        text: splitLoadMoreMarker(m.content ?? '').text,
      }));
    const live: Row[] = [];
    if (pendingUser != null) live.push({ key: 'live-user', role: 'user', text: pendingUser });
    if (streamText != null) {
      live.push({
        key: 'live-assistant',
        role: 'assistant',
        text: splitLoadMoreMarker(stabilizeStreamText(streamText, isSending)).text,
        streaming: isSending,
      });
    }
    return [...persisted, ...live];
  }, [messagesQ.data, pendingUser, streamText, isSending]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);
  useEffect(() => { if (rows.length) scrollToEnd(); }, [rows.length, scrollToEnd]);

  const ensureSession = useCallback(async (): Promise<number> => {
    if (activeId) return activeId;
    const s = await createAssistantSession(t('assistant.newChat'));
    setSessionId(s.id);
    void qc.invalidateQueries({ queryKey: assistantKeys.sessions() });
    return s.id;
  }, [activeId, qc, t]);

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message || isSending) return;
    setInput('');
    setPendingUser(message);
    setStreamText('');
    setIsSending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const sid = await ensureSession();
      let got = '';
      try {
        got = await streamAssistantMessage(
          sid, message,
          { onDelta: (d) => setStreamText((prev) => (prev ?? '') + d) },
          controller.signal,
        );
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // user stopped — keep partial text
        // Streaming transport failed (old dev-client, proxy, 401 needing a
        // refresh…) — fall back to the non-stream endpoint via axios (which
        // does the token refresh).
        const r = await sendAssistantMessage(sid, message);
        got = r.response ?? '';
        setStreamText(got);
      }
      if (!got.trim()) throw new Error('empty_answer');
      // Sync with the server-canonical transcript, then drop the local pair.
      await qc.invalidateQueries({ queryKey: assistantKeys.messages(sid) });
      setPendingUser(null);
      setStreamText(null);
    } catch {
      // Keep the user's text for retry (improvement over web, which just
      // deletes the failed bubble).
      setInput(message);
      setPendingUser(null);
      setStreamText(null);
      toast.error(t('assistant.streamError'));
    } finally {
      setIsSending(false);
      abortRef.current = null;
    }
  }, [ensureSession, isSending, qc, t]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const newChat = useCallback(async () => {
    if (isSending) return;
    try {
      const s = await createAssistantSession(t('assistant.newChat'));
      setSessionId(s.id);
      setShowSessions(false);
      void qc.invalidateQueries({ queryKey: assistantKeys.sessions() });
    } catch {
      toast.error(t('assistant.loadError'));
    }
  }, [isSending, qc, t]);

  const removeSession = useCallback(async (id: number) => {
    const ok = await confirm({
      title: t('assistant.deleteConfirmTitle'),
      message: t('assistant.deleteConfirmMessage'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAssistantSession(id);
      if (id === activeId) setSessionId(null);
      void qc.invalidateQueries({ queryKey: assistantKeys.all });
    } catch {
      toast.error(t('assistant.loadError'));
    }
  }, [activeId, qc, t]);

  const renderRow = useCallback(({ item }: { item: Row }) => (
    <View style={[styles.bubbleRow, item.role === 'user' ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
        {item.streaming && !item.text ? (
          <Text style={styles.thinking}>{t('assistant.thinking')}</Text>
        ) : (
          <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]} selectable>
            {item.text}
            {item.streaming ? ' ▍' : ''}
          </Text>
        )}
      </View>
    </View>
  ), [styles, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={styles.backBtn} hitSlop={10}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('assistant.title')}</Text>
          <Text style={styles.headerSub}>{isSending ? t('assistant.thinking') : t('assistant.subtitle')}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowSessions((v) => !v)} style={styles.headerBtn} hitSlop={10}>
          <Icon name="checklist" size={20} color={showSessions ? colors.primaryLight : colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={newChat} style={styles.headerBtn} hitSlop={10} disabled={isSending}>
          <Icon name="plus" size={22} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>

      {showSessions && (
        <View style={styles.sessionsPanel}>
          <Text style={styles.sessionsTitle}>{t('assistant.sessionsTitle')}</Text>
          {sessions.length === 0 ? (
            <Text style={styles.sessionsEmpty}>{t('assistant.sessionsEmpty')}</Text>
          ) : (
            <ScrollView style={styles.sessionsList} showsVerticalScrollIndicator={false}>
              {sessions.map((s) => (
                <View key={s.id} style={[styles.sessionRow, s.id === activeId && styles.sessionRowActive]}>
                  <TouchableOpacity
                    style={styles.sessionNameBtn}
                    onPress={() => { setSessionId(s.id); setShowSessions(false); }}
                  >
                    <Text style={[styles.sessionName, s.id === activeId && styles.sessionNameActive]} numberOfLines={1}>
                      {s.name || t('assistant.sessionFallback')} · #{s.id}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeSession(s.id)} hitSlop={8} style={styles.sessionDelete}>
                    <Icon name="close" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {activeId && messagesQ.isLoading ? (
          <LoadingView />
        ) : activeId && messagesQ.isError ? (
          <ErrorState title={t('assistant.loadError')} onRetry={() => messagesQ.refetch()} />
        ) : rows.length === 0 ? (
          <View style={styles.flex}>
            <EmptyState icon="target" title={t('assistant.sessionsEmpty')} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(r) => r.key}
            renderItem={renderRow}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToEnd}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder={t('assistant.inputPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!isSending}
          />
          {isSending ? (
            <TouchableOpacity style={[styles.sendBtn, styles.stopBtn]} onPress={stop} hitSlop={8}>
              <ActivityIndicator size="small" color={colors.onPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={() => send(input)}
              disabled={!input.trim()}
              hitSlop={8}
            >
              <Icon name="chevronRight" size={22} color={colors.onPrimary} strokeWidth={2.4} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.disclaimer}>{t('assistant.disclaimer')}</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, paddingHorizontal: 6 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    headerSub: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
    headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

    sessionsPanel: { borderBottomWidth: 1, borderBottomColor: c.cardBorder, backgroundColor: c.card, paddingVertical: 8, maxHeight: 260 },
    sessionsTitle: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, marginBottom: 4 },
    sessionsEmpty: { fontSize: 13, color: c.textMuted, paddingHorizontal: 16, paddingVertical: 8 },
    sessionsList: { maxHeight: 210 },
    sessionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
    sessionRowActive: { backgroundColor: c.primarySoft },
    sessionNameBtn: { flex: 1 },
    sessionName: { fontSize: 14, color: c.text },
    sessionNameActive: { color: c.primaryLight, fontWeight: '700' },
    sessionDelete: { paddingLeft: 12 },

    listContent: { paddingHorizontal: 12, paddingVertical: 12 },
    bubbleRow: { flexDirection: 'row', marginBottom: 10 },
    rowUser: { justifyContent: 'flex-end' },
    rowAssistant: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '86%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleUser: { backgroundColor: c.primary, borderBottomRightRadius: 4 },
    bubbleAssistant: { backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 14.5, lineHeight: 21, color: c.text },
    bubbleTextUser: { color: c.onPrimary },
    thinking: { fontSize: 14, color: c.textMuted, fontStyle: 'italic' },

    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8 },
    input: {
      flex: 1, minHeight: 44, maxHeight: 130, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder,
      backgroundColor: c.card, color: c.text, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, fontSize: 14.5,
    },
    sendBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { opacity: 0.4 },
    stopBtn: { backgroundColor: c.error },
    disclaimer: { fontSize: 11, color: c.textMuted, textAlign: 'center', paddingVertical: 6, paddingHorizontal: 16 },
  });
