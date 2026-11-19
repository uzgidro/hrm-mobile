// «Shu oydagi buyruqlar»: approved overtime orders that fall on rest days (they already show in the grid).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Card, Text } from '@/ui';
import type { WeekendOrder } from '../types';
import { fmtDate } from '../utils/weekend';

export function OrdersPanel({ orders }: { orders: WeekendOrder[] }) {
  const { t } = useTranslation();
  return (
    <Card title={`${t('weekendTabel.ordersTitle')} (${orders.length})`} icon="orders" tint="orange" testID="weekend-orders">
      <View style={styles.list}>
        {orders.map((o) => (
          <View key={`${o.order_act_id}-${o.employee_id}`} style={styles.item} testID={`weekend-order-${o.order_act_id}`}>
            <Text variant="body" weight="700">
              {o.ref}
            </Text>
            <Text variant="caption" tone="muted">
              {o.employee_name} · {fmtDate(o.date_from)}
              {o.date_to !== o.date_from ? ` – ${fmtDate(o.date_to)}` : ''}
            </Text>
            <View style={styles.days}>
              {o.rest_days.length === 0 ? (
                <Text variant="caption" tone="subtle">
                  {t('weekendTabel.ordersNoRest')}
                </Text>
              ) : (
                o.rest_days.map((d) => <Badge key={d} label={fmtDate(d)} tone="brand" />)
              )}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  item: { gap: 2 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
});
