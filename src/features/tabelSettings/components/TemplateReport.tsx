// «Tizim nimani tanidi» (web v2 `TabelTemplateReport`): what the server recognised in an uploaded filled tabel —
// per sheet the header → value mapping, plus the status codes found in its legend. `key === null` means the
// column stays in the form but is not calculated.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Card, Text } from '@/ui';
import type { Autodetect, TabelTemplateColumns } from '../utils/tabelTemplate';

export function TemplateReport({ autodetect, catalog }: { autodetect: Autodetect; catalog?: TabelTemplateColumns }) {
  const { t, i18n } = useTranslation();
  const keyLabel = (key: string) => {
    const path = `tabelSettings.tplKey.${key}`;
    if (i18n.exists(path)) return t(path);
    return catalog?.summary.find((c) => c.key === key)?.label ?? catalog?.identity.find((c) => c.key === key)?.label ?? key;
  };
  const statusLabel = (status: string) => catalog?.codes.find((c) => c.key === status)?.label ?? status;
  const codes = Object.entries(autodetect.codes ?? {});

  return (
    <Card title={t('tabelSettings.tplrTitle')} icon="check" tint="green" testID="tabel-report">
      <View style={styles.stack}>
        {autodetect.sheets.map((sh, i) => (
          <View key={`${sh.sheet}-${i}`} style={styles.sheet} testID={`tabel-report-sheet-${i}`}>
            <View style={styles.head}>
              <Text variant="body" weight="700">
                {sh.sheet}
              </Text>
              <Badge label={sh.kind === 'main' ? t('tabelSettings.tplrMain') : t('tabelSettings.tplrWeekend')} tone={sh.kind === 'main' ? 'brand' : 'warning'} />
              <Badge label={sh.grouped ? t('tabelSettings.tplrGrouped') : t('tabelSettings.tplrFlat')} />
            </View>
            <Text variant="caption" tone="subtle">
              {t('tabelSettings.tplrDays', { n: sh.days_found })} · {t('tabelSettings.tplrRows', { n: sh.rows_removed })}
            </Text>
            {sh.columns.map((c) => (
              <View key={c.column} style={styles.col}>
                <Text variant="caption" tone="subtle" style={styles.letter}>
                  {c.column}
                </Text>
                <Text variant="caption" style={styles.flex}>
                  {c.header}
                </Text>
                <Text variant="caption" tone={c.key ? 'brand' : 'subtle'} weight={c.key ? '700' : undefined} style={styles.flex}>
                  {c.key ? keyLabel(c.key) : t('tabelSettings.tplrIgnored')}
                </Text>
              </View>
            ))}
          </View>
        ))}
        {codes.length > 0 && (
          <View style={styles.sheet}>
            <Text variant="label" tone="muted">
              {t('tabelSettings.tplrCodes')}
            </Text>
            <View style={styles.codes}>
              {codes.map(([status, code]) => (
                <Badge key={status} testID={`tabel-code-${status}`} label={`${statusLabel(status)}: ${code}`} tone="info" />
              ))}
            </View>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  sheet: { gap: 4 },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  col: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  letter: { width: 24 },
  flex: { flex: 1 },
  codes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
