// Tuzilma sxemasi (TZ 4.2.6) — filial bo'yicha bo'ysunish daraxti. Bog'langan
// tugun shtat jadvali birliklarini ko'rsatadi, bog'lanmagani — qo'lda yozilgan soni.
// Sxemani chizish/tahrirlash — web'da (OrgChart muharriri).
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { fmtUnits } from '@/utils/units';
import { EmptyState, ErrorState, Skeleton, Text } from '@/ui';
import type { HierarchyNode } from '../api/queries';
import { buildTree, flattenTree } from '../utils/tree';

export function OrgTree({
  nodes,
  loading,
  error,
  onRetry,
}: {
  nodes: HierarchyNode[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const flat = useMemo(() => flattenTree(buildTree(nodes)), [nodes]);

  if (error) return <ErrorState onRetry={onRetry} />;
  if (loading) return <Skeleton height={220} />;
  if (flat.length === 0) return <EmptyState title={t('structure.chartEmpty')} message={t('structure.chartEmptyHint')} />;

  return (
    <View>
      {flat.map(({ node, depth }) => {
        const linked = node.department_id != null || node.planned_units != null;
        const vacant = Number(node.vacant_units ?? 0);
        return (
          <View
            key={node.id}
            testID={`org-node-${node.id}`}
            style={[styles.node, { marginLeft: Math.min(depth, 6) * 16, borderLeftColor: depth ? colors.border : colors.brand }]}
          >
            <Text variant="label">{node.name || node.department_name || '—'}</Text>
            {!!node.description && (
              <Text variant="caption" tone="muted">
                {node.description}
              </Text>
            )}
            {linked ? (
              <Text variant="caption" tone={vacant < 0 ? 'danger' : vacant > 0 ? 'success' : 'subtle'}>
                {t('structure.units', {
                  occupied: fmtUnits(node.occupied_units),
                  planned: fmtUnits(node.planned_units),
                  vacant: fmtUnits(node.vacant_units),
                })}
              </Text>
            ) : node.employee_count != null ? (
              <Text variant="caption" tone="subtle">
                {t('structure.headcount', { count: node.employee_count })}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  node: { borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 8, gap: 2 },
});
