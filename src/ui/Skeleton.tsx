// Skeleton blok: ma'lumot zonasida spinner/maskot o'rniga. Yumshoq opacity pulsi
// (reanimated); testda animatsiya o'rnatilmasa ham statik ko'rinadi.
import React, { useEffect } from 'react';
import { type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

export function Skeleton({
  width = '100%',
  height,
  radius = radii.sm,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
}) {
  const { colors: c } = useTheme();
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.5, { duration: 800 }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: c.skeleton }, anim]} />;
}
