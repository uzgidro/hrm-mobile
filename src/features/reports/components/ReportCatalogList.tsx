// Hisobotlar katalogi (web v2 `ReportCatalog`): qidiruv + toifalar (davomat / kadrlar / KPI).
// Ro'yxat serverniki — bu yerda faqat guruhlanadi va qidiriladi. Majburiy parametri mobil
// chiza olmaydigan hisobot «Web versiyada» belgisi bilan (ochilganda forma yo'q).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Card, EmptyState, ListRow, SearchField, Skeleton, Text } from '@/ui';
import { CATALOG_GROUPS, catalogMatch, groupCatalog } from '../utils/catalog';
import { reportDesc, reportLabel } from '../utils/labels';
import { isWebOnlyReport } from '../utils/params';
import type { ReportCatalogItem } from '../utils/types';

export function ReportCatalogList({
  items,
  loading,
  onOpen,
}: {
  items: ReportCatalogItem[];
  loading: boolean;
  onOpen: (code: string) => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');

  if (loading) return <Skeleton height={260} />;
  if (!items.length) {
    return (
      <Card>
        <EmptyState title={t('reports.catalogEmpty')} message={t('reports.catalogEmptyHint')} />
      </Card>
    );
  }
  const groups = groupCatalog(items, (r) => catalogMatch(r, q, reportLabel(r.title_key, r.code), reportDesc(r.code)));
  return (
    <View style={styles.root}>
      <SearchField value={q} onChangeText={setQ} placeholder={t('reports.searchPlaceholder')} testID="reports-search" />
      {groups.length === 0 ? (
        <Card>
          <EmptyState title={t('common.noMatch')} message={t('common.noMatchHint')} />
        </Card>
      ) : (
        groups.map((g) => {
          const meta = CATALOG_GROUPS.find((x) => x.key === g.key)!;
          return (
            <Card key={g.key} title={`${t(meta.labelKey)} · ${g.items.length}`} icon={meta.icon} tint="violet">
              {g.items.map((r) => {
                const web = isWebOnlyReport(r);
                const desc = reportDesc(r.code);
                return (
                  <ListRow
                    key={r.code}
                    testID={`report-item-${r.code}`}
                    title={reportLabel(r.title_key, r.code)}
                    subtitle={desc || undefined}
                    right={web ? <Badge label={t('reports.webOnly')} tone="neutral" /> : undefined}
                    chevron={!web}
                    onPress={() => onOpen(r.code)}
                  />
                );
              })}
            </Card>
          );
        })
      )}
      <Text variant="caption" tone="subtle">
        {t('reports.runWebOnly')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
});
