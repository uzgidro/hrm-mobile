// HOZIR ONLAYN (v2 `OnlineNowStrip`): hozir tizimdagilar soni, bugungi va 14 kunlik eng yuqori
// ko'rsatkich bilan; bosilsa — kimlar (ism, filial · qurilmalar soni). Redis'dagi qurilma bo'yicha
// borlik: bir odam noutbuk va telefonda bo'lsa ham bir marta sanaladi. Ruxsat bo'lmasa — yashirin.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Card, Text } from '@/ui';
import { onlineHistoryQuery, onlineNowQuery } from '../api/queries';
import { onlinePeaks } from '../utils/auditLog';

export function OnlineNowCard() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  const now = useQuery(onlineNowQuery());
  const history = useQuery(onlineHistoryQuery());

  if (now.isError && !now.data) return null;
  const { today, record } = onlinePeaks(history.data ?? []);
  const users = now.data?.users ?? [];

  return (
    <Card style={styles.card} testID="audit-online">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID="audit-online-toggle"
        style={styles.head}
      >
        <View style={[styles.dot, { backgroundColor: c.success }]} />
        <Text variant="heading">{t('auditLog.onlineNow')}</Text>
        <View style={[styles.count, { backgroundColor: c.successSoft }]}>
          <Text variant="label" tone="success" weight="700" testID="audit-online-count">
            {now.data ? String(now.data.count) : '…'}
          </Text>
        </View>
        <View style={styles.flex} />
        <Icon name={open ? 'arrowUp' : 'arrowDown'} size={16} color={c.fgSubtle} />
      </Pressable>
      <Text variant="caption" tone="muted" testID="audit-online-peaks">
        {`${t('auditLog.onlineToday')}: ${today} · ${t('auditLog.onlineRecord')}: ${record}`}
      </Text>
      {open && (
        <View style={[styles.list, { borderTopColor: c.border }]}>
          {users.length === 0 ? (
            <Text variant="caption" tone="subtle">
              {t('auditLog.onlineEmpty')}
            </Text>
          ) : (
            users.map((u) => (
              <View key={u.user_id} style={[styles.user, { backgroundColor: c.surface2 }]}>
                <Text variant="label" numberOfLines={1}>
                  {u.name ?? '—'}
                </Text>
                <Text variant="caption" tone="subtle" numberOfLines={1}>
                  {`${u.organization_branch_name ?? ''}${u.devices?.length ? ` · ${u.devices.length}` : ''}`}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  count: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 1 },
  flex: { flex: 1 },
  list: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  user: { borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 8 },
});
