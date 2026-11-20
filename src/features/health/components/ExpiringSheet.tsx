// «Muddati tugayapti» (v2 `ExpiringModal`): grades whose period ends within 14 days
// and that nothing newer replaces. «Davom ettirish» is two steps — a preview that
// shows the next periods and writes nothing, then the confirmation.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Sheet, Skeleton, Text } from '@/ui';
import { healthExpiringQuery } from '../api/queries';
import { useRenewHealthChecks } from '../api/mutations';
import { EXPIRING_DAYS, STATUS_TONE, type RenewResult } from '../utils/health';

const fmt = (d: string) => dayjs(d).format('DD.MM.YYYY');

export function ExpiringSheet({ branchId, onClose }: { branchId: number; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const q = useQuery(healthExpiringQuery(branchId, true));
  const rows = q.data ?? [];
  const renew = useRenewHealthChecks();
  // Rows the nurse unticked; v2 starts with every row ticked.
  const [unpicked, setUnpicked] = useState<number[]>([]);
  const [preview, setPreview] = useState<RenewResult | null>(null);
  const ids = rows.map((r) => r.check_id).filter((id) => !unpicked.includes(id));

  const toggle = (id: number) => {
    setPreview(null);
    setUnpicked((u) => (u.includes(id) ? u.filter((x) => x !== id) : [...u, id]));
  };

  const doPreview = async () => {
    try {
      setPreview(await renew.mutateAsync({ ids, apply: false }));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };
  const doApply = async () => {
    try {
      const res = await renew.mutateAsync({ ids, apply: true });
      res.failed.forEach((f) => toast.error(`#${f.check_id}: ${f.error}`));
      if (res.created.length) toast.success(t('health.renewed', { count: res.created.length }));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  const next = new Map(preview?.items.map((i) => [i.check_id, i]));

  return (
    <Sheet visible onClose={onClose} title={t('health.expiringTitle')}>
      <View style={styles.body}>
        <Text variant="caption" tone="muted">
          {t('health.expiringHint', { count: EXPIRING_DAYS })}
        </Text>
        {q.isPending ? (
          <Skeleton height={120} />
        ) : !rows.length ? (
          <Text variant="body" tone="muted" style={styles.none}>
            {t('health.expiringNone')}
          </Text>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
            {rows.map((r) => {
              const on = !unpicked.includes(r.check_id);
              const n = next.get(r.check_id);
              return (
                <Pressable
                  key={r.check_id}
                  testID={`health-expiring-${r.check_id}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(r.check_id)}
                  style={styles.item}
                >
                  <View
                    style={[
                      styles.box,
                      { borderColor: on ? c.brand : c.border, backgroundColor: on ? c.brand : 'transparent' },
                    ]}
                  >
                    {on ? <Icon name="check" size={14} color={c.fgOnBrand} strokeWidth={3} /> : null}
                  </View>
                  <View style={styles.flex}>
                    <Text variant="heading" numberOfLines={1}>
                      {r.legal_name || '—'}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {fmt(r.date_from)} – {fmt(r.date_to)} · {t('health.daysLeft', { count: r.days_left })}
                    </Text>
                    {n ? (
                      <Text variant="caption" tone="brand" testID={`health-renew-next-${r.check_id}`}>
                        → {fmt(n.date_from)} – {fmt(n.date_to)}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    label={t(`health.short_${r.status}`, { defaultValue: r.label ?? r.status })}
                    tone={STATUS_TONE[r.status] ?? 'neutral'}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        {preview && preview.skipped.length > 0 ? (
          <Text variant="caption" tone="muted">
            {t('health.renewSkipped', { count: preview.skipped.length })}
          </Text>
        ) : null}
        {rows.length > 0 &&
          (preview ? (
            <Button
              testID="health-renew-apply"
              label={t('health.renewApply', { count: preview.items.length })}
              full
              size="lg"
              loading={renew.isPending}
              disabled={!preview.items.length}
              onPress={() => void doApply()}
            />
          ) : (
            <Button
              testID="health-renew-preview"
              label={t('health.renew')}
              full
              size="lg"
              loading={renew.isPending}
              disabled={!ids.length}
              onPress={() => void doPreview()}
            />
          ))}
        <Button label={t('common.cancel')} variant="ghost" full onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 8, flexShrink: 1 },
  scroll: { flexShrink: 1 },
  list: { gap: 4 },
  none: { paddingVertical: 24, textAlign: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
});
