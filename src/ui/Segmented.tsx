// Segment tanlagich (Kann tabs): surface2 pill trek, faol — oq pill + yengil soya.
// Sig'masa: avval zichlashadi (kichikroq ichki chekinish), shunda ham sig'masa — gorizontal
// aylanadi, chetda «davomi bor» xiralashuvi ko'rinadi va faol segment ko'rinishga suriladi
// (yashirin kesilgan «Barch…» bo'lmasin).
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, shadow } from '@/theme/tokens';
import { Text } from './Text';

export type SegmentOption<T extends string> = { value: T; label: string; count?: number };

const FADE = 28;

/** Trek konteynerga sig'adimi — sof funksiya (1px yaxlitlash zaxirasi bilan). */
export function segmentsOverflow(contentWidth: number, containerWidth: number): boolean {
  return containerWidth > 0 && contentWidth > containerWidth + 1;
}

/** `#RRGGBB` → shu rangning shaffof varianti (gradient kul rangga og'masin). */
function clear(color: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}00` : 'transparent';
}

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
  const scrollRef = React.useRef<ScrollView>(null);
  const itemX = React.useRef<Record<string, number>>({});
  const [containerW, setContainerW] = React.useState(0);
  // Zich bo'lmagan holatdagi tabiiy kenglik — zichlashuv qarori shundan (aks holda tebranadi).
  const [naturalW, setNaturalW] = React.useState(0);
  const [contentW, setContentW] = React.useState(0);
  const [scrollX, setScrollX] = React.useState(0);

  const dense = segmentsOverflow(naturalW, containerW);
  const scrolls = segmentsOverflow(contentW, containerW);

  const onContentSize = (w: number) => {
    setContentW(w);
    if (!dense) setNaturalW(w);
  };

  // Faol segment ko'rinishdan tashqarida bo'lsa — unga suriladi.
  React.useEffect(() => {
    if (!scrolls) return;
    const x = itemX.current[value];
    if (x === undefined) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, x - FADE), animated: true });
  }, [value, scrolls]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setScrollX(e.nativeEvent.contentOffset.x);
  const showStart = scrolls && scrollX > 2;
  const showEnd = scrolls && scrollX + containerW < contentW - 2;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w !== containerW) setContainerW(w);
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.track, dense && styles.trackDense, { backgroundColor: c.surface2 }]}
        onContentSizeChange={onContentSize}
        onScroll={onScroll}
        scrollEventThrottle={32}
        accessibilityRole="tablist"
        testID={testID}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              onLayout={(e) => {
                itemX.current[o.value] = e.nativeEvent.layout.x;
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.seg, dense && styles.segDense, active && [{ backgroundColor: c.surface }, shadow('xs', c)]]}
            >
              <Text variant="label" tone={active ? 'fg' : 'muted'} numberOfLines={1} style={active && styles.activeText}>
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
      {showStart && (
        <LinearGradient
          pointerEvents="none"
          colors={[c.surface2, clear(c.surface2)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, styles.fadeStart]}
        />
      )}
      {showEnd && (
        <LinearGradient
          testID={testID ? `${testID}-more` : undefined}
          pointerEvents="none"
          colors={[clear(c.surface2), c.surface2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, styles.fadeEnd]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexGrow: 1, flexDirection: 'row', padding: 4, borderRadius: radii.pill, gap: 4 },
  trackDense: { gap: 2 },
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
  segDense: { paddingHorizontal: 9, gap: 4 },
  activeText: { fontWeight: '700' },
  count: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
  fade: { position: 'absolute', top: 0, bottom: 0, width: FADE },
  fadeStart: { left: 0 },
  fadeEnd: { right: 0 },
});
