import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { useBreakpoint } from '@/utils/responsive';
import { ScreenHeader, HeaderAction } from '@/components/ScreenHeader';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { LoadingView, EmptyState } from '@/components/StateViews';
import { EmployeeAvatar } from '@/components/EmployeeAvatar';
import { isMasterAdmin } from '@/utils/roles';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import type { WorkspaceCard } from '@/types';
import { workspaceDetailQuery, columnCardsQuery } from '../api/queries';
import {
  useCreateColumn, useCreateCard, useToggleCardComplete, useDeleteWorkspace,
} from '../api/mutations';

export default function LoyihaDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workspaceId = Number(id);
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bp = useBreakpoint();
  // Tablet-landscape only: lay the board out as a horizontally-scrolling row
  // of wider tracks (several columns visible at once) instead of the phone's
  // single-track vertical stack. Portrait tablet and phone are unchanged.
  const isBoardLandscape = bp.isTablet && bp.isLandscape;

  const [modal, setModal] = useState<null | { type: 'column' } | { type: 'card'; columnId: number }>(null);
  const [field1, setField1] = useState('');
  const [field2, setField2] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: ws, isLoading } = useQuery(workspaceDetailQuery(workspaceId));

  const createColumn = useCreateColumn(workspaceId);
  const createCard = useCreateCard();
  const toggleCard = useToggleCardComplete();
  const deleteWs = useDeleteWorkspace();

  const columns = useMemo(() => (ws?.columns ?? []).filter((c) => !c.is_archived), [ws]);

  const cardQueries = useQueries({
    queries: columns.map((col) => columnCardsQuery(col.id)),
  });

  const members = ws?.members ?? [];
  const canDelete = ws?.created_by_id === user?.employee?.id || isMasterAdmin(user);

  const openColumn = () => { setField1(''); setModal({ type: 'column' }); };
  const openCard = (columnId: number) => { setField1(''); setField2(''); setModal({ type: 'card', columnId }); };

  const submitModal = async () => {
    if (!field1.trim() || !modal) return;
    setBusy(true);
    try {
      if (modal.type === 'column') {
        await createColumn.mutateAsync(field1.trim());
      } else {
        await createCard.mutateAsync({
          title: field1.trim(),
          description: field2.trim() || undefined,
          column_id: modal.columnId,
        });
      }
      setModal(null);
    } catch (e) {
      Alert.alert(t('common.errorTitle'), getApiErrorMessage(e, t('errors.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  const toggleComplete = async (card: WorkspaceCard, columnId: number) => {
    try {
      await toggleCard.mutateAsync({ card, columnId });
    } catch (e) {
      Alert.alert(t('common.errorTitle'), getApiErrorMessage(e, t('projects.toggleError')));
    }
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: t('projects.deleteTitle'),
      message: t('projects.deleteConfirm'),
      confirmLabel: t('projects.deleteYes'),
      cancelLabel: t('common.cancel'),
      icon: 'trash',
      destructive: true,
    });
    if (!ok) return;
    deleteWs.mutate(workspaceId, {
      onSuccess: () => router.back(),
      onError: (e) => Alert.alert(t('common.errorTitle'), getApiErrorMessage(e, t('projects.deleteError'))),
    });
  };

  // Renders a single column's header/cards/add-card-button. Shared by the
  // phone vertical stack and the tablet-landscape horizontal row so the
  // kanban logic (drag-free reorder isn't a thing here, but statuses/cards/
  // completion toggling) has exactly one render path regardless of layout.
  const renderColumn = (col: (typeof columns)[number], idx: number) => {
    const cards = (cardQueries[idx]?.data ?? []) as WorkspaceCard[];
    const loading = cardQueries[idx]?.isLoading;
    return (
      <View key={col.id} style={[styles.column, isBoardLandscape && styles.columnLandscape]}>
        <View style={styles.columnHeader}>
          <View style={[styles.colDot, { backgroundColor: col.color || colors.primary }]} />
          <Text style={styles.columnName} numberOfLines={1}>{col.name || t('projects.columnFallback')}</Text>
          <Text style={styles.columnCount}>{cards.length}</Text>
        </View>
        {loading ? (
          <ActivityIndicator style={{ marginVertical: 12 }} color={colors.primary} />
        ) : (
          cards.map((cd) => (
            <View key={cd.id} style={[styles.taskCard, cd.is_completed && styles.taskDone]}>
              <TouchableOpacity onPress={() => toggleComplete(cd, col.id)} hitSlop={8} style={[styles.checkbox, cd.is_completed && styles.checkboxOn]}>
                {cd.is_completed && <Icon name="check" size={13} color={colors.onPrimary} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/loyiha-card-detail', params: { id: String(cd.id) } })}
              >
                <Text style={[styles.taskTitle, cd.is_completed && styles.taskTitleDone]} numberOfLines={2}>
                  {cd.title || t('projects.taskFallback')}
                </Text>
                {!!cd.description && <Text style={styles.taskDesc} numberOfLines={2}>{cd.description}</Text>}
                {!!cd.end_date && (
                  <View style={styles.taskMeta}>
                    <Icon name="calendar" size={12} color={colors.textMuted} />
                    <Text style={styles.taskDate}>{dayjs(cd.end_date).format('DD.MM.YYYY')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
        <TouchableOpacity style={styles.addCardBtn} onPress={() => openCard(col.id)} activeOpacity={0.8}>
          <Icon name="plus" size={15} color={colors.textSecondary} />
          <Text style={styles.addCardText}>{t('projects.taskAdd')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Screen edges={['top']} maxWidth={isBoardLandscape ? 'full' : undefined}>
      <ScreenHeader
        title={ws?.name || t('projects.nameFallback')}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <HeaderAction icon="edit" onPress={() => router.push({ pathname: '/loyiha-form', params: { id: String(workspaceId) } })} />
            {canDelete && <HeaderAction icon="trash" onPress={onDelete} color={colors.error} />}
          </View>
        }
      />
      {isLoading || !ws ? (
        <LoadingView />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!!ws.description && (
            <View style={styles.card}><Text style={styles.desc}>{ws.description}</Text></View>
          )}

          {members.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('projects.membersTitle', { count: members.length })}</Text>
              <View style={styles.card}>
                <View style={styles.memberWrap}>
                  {members.map((m, i) => (
                    <View key={m.id ?? i} style={styles.memberChip}>
                      <EmployeeAvatar emp={m.member ?? {}} size={26} />
                      <Text style={styles.memberName} numberOfLines={1}>{m.member?.legal_name || t('projects.memberFallback')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          <View style={styles.colHeaderRow}>
            <Text style={styles.sectionLabel}>{t('projects.columnsTitle')}</Text>
            <TouchableOpacity style={styles.addColBtn} onPress={openColumn} activeOpacity={0.8}>
              <Icon name="plus" size={15} color={colors.primary} />
              <Text style={styles.addColText}>{t('projects.columnAdd')}</Text>
            </TouchableOpacity>
          </View>

          {columns.length === 0 ? (
            <EmptyState icon="board" title={t('projects.columnsEmpty')} />
          ) : isBoardLandscape ? (
            // Tablet landscape: a horizontally-scrolling row of wider tracks so
            // several columns are visible at once instead of one cramped
            // full-width column per screen.
            <ScrollView
              testID="projects-board-scroll"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.boardRow}
            >
              {columns.map((col, idx) => renderColumn(col, idx))}
            </ScrollView>
          ) : (
            columns.map((col, idx) => renderColumn(col, idx))
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Add column / card modal */}
      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modal?.type === 'column' ? t('projects.newColumn') : t('projects.newTask')}</Text>
            <TextInput
              style={styles.modalInput}
              value={field1}
              onChangeText={setField1}
              placeholder={modal?.type === 'column' ? t('projects.columnNamePlaceholder') : t('projects.taskTitlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            {modal?.type === 'card' && (
              <TextInput
                style={[styles.modalInput, styles.modalMultiline]}
                value={field2}
                onChangeText={setField2}
                placeholder={t('projects.taskDescPlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModal(null)} disabled={busy}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, (busy || !field1.trim()) && { opacity: 0.5 }]} onPress={submitModal} disabled={busy || !field1.trim()}>
                {busy ? <ActivityIndicator color={colors.onPrimary} size="small" /> : <Text style={styles.modalSaveText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 16, marginBottom: 12 },
    desc: { fontSize: 14, color: c.textSecondary, lineHeight: 20 },

    sectionLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 4 },
    colHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
    addColBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.primarySoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    addColText: { fontSize: 13, color: c.primary, fontWeight: '700' },

    memberWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.bg, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 4, paddingRight: 12, borderWidth: 1, borderColor: c.cardBorder },
    memberName: { fontSize: 12, color: c.text, fontWeight: '600', maxWidth: 130 },

    // Tablet-landscape board row: tracks sit side by side and scroll
    // horizontally instead of stacking full-width down the screen.
    boardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 12 },

    column: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.cardBorder, padding: 12, marginBottom: 12 },
    // Fixed, wider track width so 2-3+ columns are visible at once on a
    // landscape tablet without shrinking to fit the whole board.
    columnLandscape: { width: 320, marginBottom: 0 },
    columnHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    colDot: { width: 10, height: 10, borderRadius: 5 },
    columnName: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text },
    columnCount: { fontSize: 12, fontWeight: '700', color: c.textMuted, backgroundColor: c.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },

    taskCard: { flexDirection: 'row', gap: 10, backgroundColor: c.bg, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder, padding: 12, marginTop: 8 },
    taskDone: { opacity: 0.7 },
    checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    checkboxOn: { backgroundColor: c.success, borderColor: c.success },
    taskTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    taskTitleDone: { textDecorationLine: 'line-through', color: c.textSecondary },
    taskDesc: { fontSize: 12, color: c.textSecondary, lineHeight: 17, marginTop: 4 },
    taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
    taskDate: { fontSize: 12, color: c.textMuted },

    addCardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: c.cardBorder, borderStyle: 'dashed' },
    addCardText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', paddingHorizontal: 28 },
    modalCard: { backgroundColor: c.card, borderRadius: 18, padding: 18 },
    modalTitle: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 14 },
    modalInput: { minHeight: 46, backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text, marginBottom: 10 },
    modalMultiline: { minHeight: 80, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    modalCancel: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center' },
    modalCancelText: { fontSize: 15, fontWeight: '700', color: c.textSecondary },
    modalSave: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
    modalSaveText: { fontSize: 15, fontWeight: '700', color: c.onPrimary },
  });
