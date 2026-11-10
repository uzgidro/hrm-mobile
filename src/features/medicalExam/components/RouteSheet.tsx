// The route sheet: one line per specialist with the station status in words. Used by the
// employee (read-only checklist) and by the doctor (own lines highlighted, status actions).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Badge, Text } from '@/ui';
import { isStationResolved, stationTone, type Station } from '../utils/medicalExam';

export function RouteSheet({
  stations,
  highlightIds,
  renderActions,
}: {
  stations: Station[];
  /** Station ids that belong to the viewer (doctor's own lines). */
  highlightIds?: number[];
  /** Extra controls under a line (the doctor's status buttons). */
  renderActions?: (s: Station) => React.ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.list} testID="route-sheet">
      {stations.map((s) => {
        const mine = !!highlightIds?.includes(s.id);
        const resolved = isStationResolved(s);
        return (
          <View
            key={s.id}
            testID={`station-${s.id}`}
            style={[
              styles.line,
              { backgroundColor: mine ? colors.brandSoft : colors.surface2, borderColor: mine ? colors.brand : 'transparent' },
            ]}
          >
            <View style={styles.head}>
              <View style={[styles.mark, { backgroundColor: resolved ? colors.successSoft : colors.surface }]}>
                {resolved && <Icon name="check" size={14} color={colors.success} />}
              </View>
              <View style={styles.name}>
                <Text variant="heading" numberOfLines={2}>
                  {s.specialty_name || `#${s.specialty_id}`}
                </Text>
                {s.returned && (
                  <Text variant="caption" tone="danger">
                    {t('medicalExam.route.returned')}
                  </Text>
                )}
                {!!s.doctor_name && resolved && (
                  <Text variant="caption" tone="muted">
                    {s.doctor_name}
                  </Text>
                )}
                {!!s.skip_reason && s.status === 'skipped' && (
                  <Text variant="caption" tone="muted">
                    {s.skip_reason}
                  </Text>
                )}
              </View>
              <Badge label={t(`medicalExam.station.${s.status}`)} tone={stationTone(s.status)} testID={`station-status-${s.id}`} />
            </View>
            {renderActions?.(s)}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  line: { borderRadius: radii.md, borderWidth: 1.5, padding: 12, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, gap: 2 },
});
