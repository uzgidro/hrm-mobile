import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import dayjs from 'dayjs';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { OrderAct } from '@/types';
import { statusMeta, statusColor } from '@/utils/orderStatus';

// One row of the orders list. `action` = "sizdan amal kutilmoqda" (derived by
// the list screen via needsMyAction) which highlights the card border + tag.
export function OrderListCard({ order, action }: { order: OrderAct; action: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const meta = statusMeta(order.status);
  const sc = statusColor(meta.kind, colors);

  return (
    <TouchableOpacity
      style={[styles.card, action && styles.cardAction]}
      onPress={() => router.push({ pathname: '/order-detail', params: { id: order.id } })}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardCategory} numberOfLines={1}>
          {order.category_rel?.name || 'Buyruq'}
          {order.act_number ? `  №${order.act_number}` : ''}
        </Text>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.badgeText, { color: sc.fg }]}>{meta.label}</Text>
        </View>
      </View>

      {!!order.description && (
        <Text style={styles.cardDesc} numberOfLines={2}>{order.description}</Text>
      )}

      <View style={styles.cardMeta}>
        <Text style={styles.cardMetaText}>
          {order.employee?.legal_name || order.submitter?.legal_name || ''}
        </Text>
        {!!order.created_at && (
          <Text style={styles.cardMetaText}>{dayjs(order.created_at).format('DD.MM.YYYY')}</Text>
        )}
      </View>

      {action && (
        <View style={styles.actionTag}>
          <Text style={styles.actionTagText}>Sizdan amal kutilmoqda</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 10,
      borderWidth: 1, borderColor: c.cardBorder, gap: 8,
    },
    cardAction: { borderColor: c.warning },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    cardCategory: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    cardDesc: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    cardMetaText: { fontSize: 12, color: c.textMuted },

    actionTag: { alignSelf: 'flex-start', backgroundColor: c.warningSoft, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
    actionTagText: { fontSize: 11, fontWeight: '700', color: c.warning },
  });
