// Avtoparkning vizual «belgilari» (v2 `FleetBits`): davlat raqami plastinka shaklida, bugungi
// mavjudlik nishoni va GPS belgisi — ro'yxat, so'rovlar, tashriflar va profilda bir xil.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Text } from '@/ui';
import { availability, plateParts, type Vehicle } from '../utils/vehicles';

export function PlateChip({
  plate,
  small = false,
  testID,
}: {
  plate?: string | null;
  small?: boolean;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  const parts = plateParts(plate);
  if (!parts) {
    return (
      <Text variant="caption" tone="subtle">
        —
      </Text>
    );
  }
  const h = small ? 22 : 26;
  return (
    <View
      testID={testID}
      accessibilityLabel={plate ?? ''}
      style={[styles.plate, { height: h, borderColor: c.borderStrong, backgroundColor: c.surface }]}
    >
      <View style={[styles.uz, { backgroundColor: c.brand }]}>
        <Text style={[styles.uzText, { color: c.fgOnBrand }]}>UZ</Text>
      </View>
      {!!parts.region && (
        <View style={[styles.seg, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: c.borderStrong }]}>
          <Text style={[styles.mono, small && styles.monoSmall]}>{parts.region}</Text>
        </View>
      )}
      <View style={styles.seg}>
        <Text style={[styles.mono, small && styles.monoSmall]}>{parts.rest}</Text>
      </View>
    </View>
  );
}

/** Bugun mashina nima qilyapti — bo'sh, safarda (kimda, qachongacha), so'ralgan yoki faol emas. */
export function AvailabilityBadge({ v }: { v: Vehicle }) {
  const { t } = useTranslation();
  const a = availability(v);
  const label =
    a.key === 'inactive'
      ? t('vehicles.inactive')
      : a.key === 'onTrip'
        ? `${t('vehicles.availOnTrip')}${a.until ? ` · ${a.until}` : ''}`
        : a.key === 'requested'
          ? t('vehicles.availRequested')
          : t('vehicles.availFree');
  return (
    <View style={styles.avail}>
      <Badge testID={`vehicle-avail-${v.id}`} label={label} tone={a.tone} />
      {!!a.who && (
        <Text variant="caption" tone="subtle" numberOfLines={1}>
          {a.who}
        </Text>
      )}
    </View>
  );
}

export function GpsMark({ v }: { v: Vehicle }) {
  const { colors: c } = useTheme();
  if (!v.gps_device_id) return null;
  return (
    <Text variant="caption" style={[styles.gps, { color: c.success }]}>
      ● GPS
    </Text>
  );
}

const styles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 5,
    overflow: 'hidden',
  },
  uz: { paddingHorizontal: 4, justifyContent: 'center' },
  uzText: { fontSize: 8, lineHeight: 10, fontWeight: '700' },
  seg: { paddingHorizontal: 7, justifyContent: 'center' },
  mono: { fontSize: 13, fontWeight: '800', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  monoSmall: { fontSize: 11.5 },
  avail: { gap: 2, alignItems: 'flex-start' },
  gps: { fontWeight: '700' },
});
