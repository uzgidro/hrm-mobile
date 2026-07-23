import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView, ErrorState } from '@/components/StateViews';
import type { CardAttachment, CardComment } from '@/types';
import { cardDetailQuery, cardCommentsQuery } from '../api/queries';
import { useCardActions } from '../hooks/useCardActions';
import { cardStatus, canActOnCard } from '../cardStatus';

// Read-only card detail + status actions (complete / uncomplete / reject).
// Description, dates, members, labels, attachments come nested from GET /cards/{id};
// comments are a separate query. Files open via Linking (presigned MinIO URL).
export default function CardDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardId = Number(id);
  const { user } = useAuthStore();
  const employeeId = user?.employee?.id;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: card, isLoading, isError, refetch } = useQuery(cardDetailQuery(cardId));
  const { data: comments = [] } = useQuery(cardCommentsQuery(cardId));
  const { busy, complete, uncomplete, reject } = useCardActions(cardId, refetch);

  const status = card ? cardStatus(card) : 'active';
  const canAct = card ? canActOnCard(card, employeeId) : false;

  const statusMeta = {
    active: { label: t('projects.statusActive'), color: colors.primaryLight },
    completed: { label: t('projects.statusCompleted'), color: colors.present },
    rejected: { label: t('projects.statusRejected'), color: colors.error },
  }[status];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{card?.title || t('projects.taskFallback')}</Text>
          <Text style={styles.headerSub}>{t('projects.cardDetailSubtitle')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError || !card ? (
        <ErrorState title={t('projects.cardLoadError')} onRetry={() => refetch()} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Status + title */}
            <View style={styles.card}>
              <View style={[styles.statusPill, { backgroundColor: statusMeta.color }]}>
                <Text style={styles.statusText}>{statusMeta.label}</Text>
              </View>
              <Text style={styles.title}>{card.title || t('projects.taskFallback')}</Text>
              {!!card.description && <Text style={styles.description}>{card.description}</Text>}

              {(!!card.start_date || !!card.end_date) && (
                <View style={styles.datesRow}>
                  {!!card.start_date && (
                    <View style={styles.dateItem}>
                      <Icon name="calendar" size={14} color={colors.textMuted} />
                      <Text style={styles.dateText}>{dayjs(card.start_date).format('DD.MM.YYYY')}</Text>
                    </View>
                  )}
                  {!!card.end_date && (
                    <View style={styles.dateItem}>
                      <Icon name="calendar" size={14} color={colors.error} />
                      <Text style={styles.dateText}>{dayjs(card.end_date).format('DD.MM.YYYY')}</Text>
                    </View>
                  )}
                </View>
              )}

              {(card.labels?.length ?? 0) > 0 && (
                <View style={styles.labelsRow}>
                  {card.labels!.map((l) => (
                    <View key={l.id ?? l.label?.id} style={[styles.labelChip, { backgroundColor: l.label?.color || colors.primarySoft }]}>
                      <Text style={styles.labelText}>{l.label?.name ?? '—'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Members */}
            {(card.members?.length ?? 0) > 0 && (
              <View style={styles.card}>
                <View style={styles.sectionTitleRow}><Icon name="users" size={16} color={colors.textSecondary} /><Text style={styles.sectionTitle}>{t('projects.membersTitle')}</Text></View>
                {card.members!.map((m) => (
                  <View key={m.id ?? m.member?.id} style={styles.memberRow}>
                    {m.member?.photo_path ? (
                      <Image source={{ uri: m.member.photo_path }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}><Icon name="user" size={16} color={colors.textMuted} /></View>
                    )}
                    <Text style={styles.memberName} numberOfLines={1}>{m.member?.legal_name ?? '—'}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Attachments (read-only, open via Linking) */}
            <View style={styles.card}>
              <View style={styles.sectionTitleRow}><Icon name="folder" size={16} color={colors.textSecondary} /><Text style={styles.sectionTitle}>{t('projects.attachmentsTitle')}</Text></View>
              {(card.attachments?.length ?? 0) === 0 ? (
                <Text style={styles.emptyText}>{t('projects.attachmentsEmpty')}</Text>
              ) : (
                card.attachments!.map((a: CardAttachment) => (
                  <TouchableOpacity
                    key={a.id}
                    style={styles.fileRow}
                    activeOpacity={0.7}
                    onPress={() => a.attachment_path && Linking.openURL(a.attachment_path)}
                    disabled={!a.attachment_path}
                  >
                    <Icon name="doc" size={18} color={colors.primaryLight} />
                    <Text style={styles.fileName} numberOfLines={1}>{a.original_filename ?? t('projects.fileFallback')}</Text>
                    <Icon name="chevronRight" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Comments (read-only) */}
            <View style={styles.card}>
              <View style={styles.sectionTitleRow}><Icon name="doc" size={16} color={colors.textSecondary} /><Text style={styles.sectionTitle}>{t('projects.commentsTitle')}</Text></View>
              {comments.length === 0 ? (
                <Text style={styles.emptyText}>{t('projects.commentsEmpty')}</Text>
              ) : (
                comments.map((c: CardComment) => (
                  <View key={c.id} style={styles.commentRow}>
                    <Text style={styles.commentAuthor}>{c.author?.legal_name ?? '—'}</Text>
                    <Text style={styles.commentText}>{c.text ?? ''}</Text>
                    {!!c.created_at && <Text style={styles.commentDate}>{dayjs(c.created_at).format('DD.MM.YYYY HH:mm')}</Text>}
                  </View>
                ))
              )}
            </View>

            <View style={{ height: canAct ? 96 : 24 }} />
          </ScrollView>

          {/* Status action bar — only for creator/assignee (backend also enforces). */}
          {canAct && (
            <View style={styles.actionBar}>
              {status !== 'completed' && (
                <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]} onPress={complete} disabled={busy} activeOpacity={0.8}>
                  {busy ? <ActivityIndicator color="#fff" /> : <><Icon name="check" size={18} color="#fff" /><Text style={styles.actionBtnText}>{t('projects.complete')}</Text></>}
                </TouchableOpacity>
              )}
              {status === 'completed' && (
                <TouchableOpacity style={[styles.actionBtn, styles.uncompleteBtn]} onPress={uncomplete} disabled={busy} activeOpacity={0.8}>
                  {busy ? <ActivityIndicator color={colors.text} /> : <Text style={[styles.actionBtnText, { color: colors.text }]}>{t('projects.uncomplete')}</Text>}
                </TouchableOpacity>
              )}
              {status !== 'rejected' && (
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={reject} disabled={busy} activeOpacity={0.8}>
                  <Icon name="close" size={18} color={colors.error} /><Text style={[styles.actionBtnText, { color: colors.error }]}>{t('projects.reject')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerCenter: { flex: 1, paddingHorizontal: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    headerSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    card: { backgroundColor: c.card, borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: c.cardBorder },
    statusPill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
    statusText: { fontSize: 12, fontWeight: '800', color: '#fff' },
    title: { fontSize: 18, fontWeight: '800', color: c.text },
    description: { fontSize: 14, color: c.textSecondary, marginTop: 8, lineHeight: 20 },

    datesRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
    dateItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },

    labelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    labelChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    labelText: { fontSize: 12, fontWeight: '700', color: '#fff' },

    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    emptyText: { color: c.textMuted, fontSize: 14, paddingVertical: 4 },

    memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.bg },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    memberName: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text },

    fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.cardBorder },
    fileName: { flex: 1, fontSize: 14, color: c.text, fontWeight: '500' },

    commentRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.cardBorder },
    commentAuthor: { fontSize: 13, fontWeight: '700', color: c.text },
    commentText: { fontSize: 14, color: c.textSecondary, marginTop: 2, lineHeight: 19 },
    commentDate: { fontSize: 11, color: c.textMuted, marginTop: 4 },

    actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.cardBorder },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12 },
    completeBtn: { backgroundColor: c.present },
    uncompleteBtn: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder },
    rejectBtn: { backgroundColor: c.errorSoft },
    actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
