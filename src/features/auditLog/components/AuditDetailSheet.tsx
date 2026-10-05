// Bitta jurnal yozuvi to'liq (v2 `AuditDetailModal`): metod + endpoint, kim/qayerdan/qachon,
// qurilma; keyin «nima yuborildi» — o'zgarishlar «kalit: eski → yangi» matni, qolgan maydonlar
// va to'liq tana (parol/token server tomonida `***`). Faqat o'qish. Ota `key` bilan mount qiladi.
import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { formatTashkentDateTime } from '@/utils/tashkentTime';
import { Sheet, Text } from '@/ui';
import { describeDetails, shortAgent, type AuditLog } from '../utils/auditLog';

export function AuditDetailSheet({
  row,
  actionLabel,
  resourceLabel,
  onClose,
}: {
  row: AuditLog;
  actionLabel: (a?: string | null) => string;
  resourceLabel: (r: string) => string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const d = describeDetails(row.details);
  const items: [string, string][] = [
    [t('auditLog.colTime'), formatTashkentDateTime(row.created_at)],
    [t('auditLog.colUser'), row.employee_name || '—'],
    [t('auditLog.colActorBranch'), row.actor_branch_name || '—'],
    [t('auditLog.colBranch'), row.organization_branch_name || '—'],
    [t('auditLog.colAction'), actionLabel(row.action)],
    [
      t('auditLog.colResource'),
      row.resource_type ? `${resourceLabel(row.resource_type)}${row.resource_id ? ` #${row.resource_id}` : ''}` : '—',
    ],
    [t('auditLog.colIp'), row.ip_address || '—'],
    [t('auditLog.device'), shortAgent(row.user_agent, t('auditLog.mobileApp'))],
  ];
  const box = { backgroundColor: c.surface2, borderColor: c.border };

  return (
    <Sheet visible onClose={onClose} title={t('auditLog.detailTitle')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <View style={[styles.box, box]}>
          <Text variant="label" selectable style={styles.mono} testID="audit-endpoint">
            {`${row.method ? `${row.method} ` : ''}${row.endpoint || '—'}`}
          </Text>
        </View>
        <View style={styles.grid}>
          {items.map(([k, v]) => (
            <View key={k} style={styles.item}>
              <Text variant="caption" tone="subtle">
                {k}
              </Text>
              <Text variant="label" numberOfLines={2}>
                {v}
              </Text>
            </View>
          ))}
        </View>

        {d.snapshot && (
          <Text variant="label" tone="muted" testID="audit-snapshot">
            {`${t(d.snapshot.kind === 'deleted' ? 'auditLog.deletedRecord' : 'auditLog.targetRecord')}: ${
              d.snapshot.label
            }`}
          </Text>
        )}
        {d.changes.length > 0 && (
          <View style={styles.section}>
            <Text variant="label" tone="muted" weight="700">
              {t('auditLog.changes')}
            </Text>
            {d.changes.map((x) => (
              <Text key={x.key} variant="label" testID={`audit-change-${x.key}`}>
                <Text variant="label" style={styles.mono}>{`${x.key}: `}</Text>
                <Text variant="label" tone="danger">
                  {x.from}
                </Text>
                {' → '}
                <Text variant="label" tone="success">
                  {x.to}
                </Text>
              </Text>
            ))}
          </View>
        )}
        {d.fields.length > 0 && (
          <View style={styles.section}>
            <Text variant="label" tone="muted" weight="700">
              {d.changes.length ? t('auditLog.otherFields') : t('auditLog.fields')}
            </Text>
            {d.fields.map((x) => (
              <Text key={x.key} variant="label" testID={`audit-field-${x.key}`}>
                <Text variant="label" style={styles.mono}>{`${x.key}: `}</Text>
                {x.value}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text variant="label" tone="muted" weight="700">
            {t('auditLog.requestBody')}
          </Text>
          {d.raw ? (
            <ScrollView style={[styles.code, box]} nestedScrollEnabled>
              <Text variant="caption" tone="muted" selectable style={styles.mono} testID="audit-raw">
                {d.raw}
              </Text>
            </ScrollView>
          ) : (
            <Text variant="caption" tone="subtle">
              {t('auditLog.noBody')}
            </Text>
          )}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  body: { gap: 12, paddingBottom: 8 },
  box: { borderRadius: radii.sm, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 16 },
  item: { flexBasis: '45%', flexGrow: 1, minWidth: 0 },
  section: { gap: 4 },
  code: { maxHeight: 240, borderRadius: radii.sm, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
