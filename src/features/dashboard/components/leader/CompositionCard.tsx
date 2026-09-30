// «Xodimlar tarkibi» (v2 DemographicsPanel): jami + jins chizig'i, keyin
// yosh / millat / lavozim bo'limlari — Segmented bilan almashadi (telefonda joy tejaydi).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Card, Donut, ErrorState, ProgressBar, Segmented, Skeleton, Text } from '@/ui';
import { compositionQuery } from '../../api/queries';

type Tab = 'age' | 'nationality' | 'position';

export function CompositionCard({ branchId }: { branchId: number | undefined }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const q = useQuery(compositionQuery(branchId));
  const [tab, setTab] = useState<Tab>('age');
  const ring = [c.chart4, c.chart2, c.chart1, c.chart3, c.chart5, c.chart6];

  const body = () => {
    if (q.isPending) return <Skeleton height={200} />;
    if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
    const d = q.data;
    const gTotal = d.gender.male + d.gender.female + d.gender.unknown;
    const genders = [
      { label: t('dashboard.home.male'), n: d.gender.male, color: c.chart4 },
      { label: t('dashboard.home.female'), n: d.gender.female, color: c.chart3 },
      { label: t('dashboard.home.unknownGender'), n: d.gender.unknown, color: c.chart6 },
    ];
    const slices = tab === 'age' ? d.age : tab === 'nationality' ? d.nationality : [];
    const sliceTotal = slices.reduce((a, s) => a + s.value, 0);
    const maxPos = Math.max(1, ...d.positions.map((p) => p.count));
    return (
      <>
        <View style={styles.headline}>
          <Text variant="display" tone="brand">
            {String(d.total)}
          </Text>
          <Text variant="caption" tone="subtle">
            {t('dashboard.home.staffTotal')}
          </Text>
        </View>
        {gTotal > 0 && (
          <>
            <View style={[styles.genderBar, { backgroundColor: c.surface2 }]}>
              {genders.map((g, i) =>
                g.n > 0 ? <View key={i} style={{ flex: g.n, backgroundColor: g.color }} /> : null,
              )}
            </View>
            <View style={styles.genderLegend}>
              {genders.map((g, i) => (
                <View key={i} style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: g.color }]} />
                  <Text variant="caption" tone="muted">{`${g.label} ${g.n}`}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        <View style={styles.tabs}>
          <Segmented<Tab>
            options={[
              { value: 'age', label: t('dashboard.home.byAge') },
              { value: 'nationality', label: t('dashboard.home.byNationality') },
              { value: 'position', label: t('dashboard.home.byPosition') },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>
        {tab === 'position' ? (
          d.positions.slice(0, 8).map((p) => (
            <View key={p.label} style={styles.posRow}>
              <Text variant="caption" numberOfLines={1} style={styles.posLabel}>
                {p.label}
              </Text>
              <View style={styles.posBar}>
                <ProgressBar value={p.count / maxPos} color={c.brand} />
              </View>
              <Text variant="caption" style={styles.posValue}>
                {String(p.count)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.sliceRow}>
            <Donut
              segments={slices.map((s, i) => ({ value: s.value, color: ring[i % ring.length] }))}
              size={112}
              stroke={14}
              accessibilityLabel={tab === 'age' ? t('dashboard.home.byAge') : t('dashboard.home.byNationality')}
            />
            <View style={styles.sliceLegend}>
              {slices.map((s, i) => (
                <View key={s.key} style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: ring[i % ring.length] }]} />
                  <Text variant="caption" style={styles.flex}>
                    {s.key}
                  </Text>
                  <Text variant="caption" tone="subtle">{`${sliceTotal ? Math.round((s.value / sliceTotal) * 100) : 0}%`}</Text>
                  <Text variant="caption" style={styles.posValue}>
                    {String(s.value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </>
    );
  };

  return (
    <Card title={t('dashboard.home.composition')} icon="users" tint="violet" testID="card-composition">
      {body()}
    </Card>
  );
}

const styles = StyleSheet.create({
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  genderBar: { flexDirection: 'row', height: 10, borderRadius: radii.pill, overflow: 'hidden' },
  genderLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tabs: { marginTop: 14, marginBottom: 12 },
  posRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  posLabel: { width: '42%' },
  posBar: { flex: 1 },
  posValue: { width: 32, textAlign: 'right', fontWeight: '700', fontVariant: ['tabular-nums'] },
  sliceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sliceLegend: { flex: 1, gap: 6 },
  flex: { flex: 1 },
});
