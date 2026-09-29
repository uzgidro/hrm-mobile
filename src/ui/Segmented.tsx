// Segment tanlagich (Kann tabs): surface2 pill trek, faol — oq pill + yengil soya.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, shadow } from '@/theme/tokens';
import { Text } from './Text';

export type SegmentOption<T extends string> = { value: T; label: string; count?: number };

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.track, { backgroundColor: c.surface2 }]}
      accessibilityRole="tablist"
      testID={testID}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.seg, active && [{ backgroundColor: c.surface }, shadow('xs', c)]]}
          >
            <Text variant="label" tone={active ? 'fg' : 'muted'} style={active && styles.activeText}>
              {o.label}
            </Text>
            {o.count !== undefined && o.count > 0 && (
              <View style={[styles.count, { backgroundColor: active ? c.brand : c.border }]}>
                <Text variant="caption" style={[styles.countText, { color: active ? c.fgOnBrand : c.fgMuted }]}>
                  {o.count > 99 ? '99+' : String(o.count)}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: { flexGrow: 1, flexDirection: 'row', padding: 4, borderRadius: radii.pill, gap: 4 },
  seg: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
  },
  activeText: { fontWeight: '700' },
  count: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
});
