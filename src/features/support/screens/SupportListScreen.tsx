import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { SupportTicket } from '@/types';
import { Icon } from '@/components/Icon';
import { LoadingView, EmptyState, ErrorState } from '@/components/StateViews';
import { ticketStatusKey, ticketStatusKind, ticketPriorityKey, type StatusKind } from '@/utils/supportStatus';
import { myTicketsQuery } from '../api/queries';

const statusColors = (kind: StatusKind, c: ThemeColors): { bg: string; fg: string } => {
  switch (kind) {
    case 'progress': return { bg: c.primarySoft, fg: c.primary };
    case 'done': return { bg: c.successSoft, fg: c.success };
    case 'rated': return { bg: c.successSoft, fg: c.success };
    default: return { bg: c.card, fg: c.textMuted };
  }
};

export default function SupportListScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: tickets = [], isLoading, isError, refetch, isFetching } = useQuery(myTicketsQuery());

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.backBtn}
          hitSlop={10}
        >
          <Icon name="chevronLeft" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('support.title')}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/texnik-yordam-form')} activeOpacity={0.85}>
          <Icon name="plus" size={22} color={colors.onPrimary} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>{t('support.subtitle')}</Text>

      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorState title={t('support.loadError')} onRetry={refetch} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(x) => String(x.id)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item }: { item: SupportTicket }) => {
            const sc = statusColors(ticketStatusKind(item.status), colors);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/texnik-yordam-detail', params: { id: String(item.id) } })}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.priority}>{t(ticketPriorityKey(item.priority))}</Text>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.fg }]}>{t(ticketStatusKey(item.status))}</Text>
                  </View>
                </View>
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>{item.assignee?.legal_name || t('support.noAssignee')}</Text>
                  {!!item.created_at && <Text style={styles.metaText}>{dayjs(item.created_at).format('DD.MM.YYYY')}</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<EmptyState icon="help" title={t('support.empty')} />}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: -8, marginRight: -4 },
    title: { fontSize: 26, fontWeight: '800', color: c.text },
    subtitle: { fontSize: 13, color: c.textMuted, paddingHorizontal: 16, marginBottom: 8 },
    addBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
    card: { padding: 14, marginBottom: 10, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.cardBorder },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    priority: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    desc: { fontSize: 14, color: c.text, lineHeight: 20 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    metaText: { fontSize: 12, color: c.textMuted },
  });
