// The territory plan image with POI pins at x_pct / y_pct. With `onTap` a tap places / moves the
// draft pin (registrar editor); without it the plan is read-only.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Text } from '@/ui';
import type { Poi, TerritoryPlan } from '../../types1';
import { planPoint } from '../../utils/sections1';

export function PlanView({
  plan,
  pois,
  activeId,
  draft,
  onTap,
  onPoi,
}: {
  plan: NonNullable<TerritoryPlan>;
  pois: Poi[];
  activeId?: number | null;
  draft?: { x_pct: number; y_pct: number } | null;
  onTap?: (p: { x_pct: number; y_pct: number }) => void;
  onPoi?: (p: Poi) => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [w, setW] = useState(0);
  const ratio = plan.width > 0 && plan.height > 0 ? plan.width / plan.height : 4 / 3;
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const tap = (e: GestureResponderEvent) => {
    if (!onTap || w <= 0) return;
    const p = planPoint(e.nativeEvent.locationX, e.nativeEvent.locationY, w, w / ratio);
    if (p) onTap(p);
  };
  return (
    <View style={styles.wrap} testID="plan-view">
      <Pressable onPress={tap} disabled={!onTap} onLayout={onLayout} style={[styles.box, { aspectRatio: ratio, borderColor: c.border, backgroundColor: c.surface2 }]} accessibilityLabel={t('san1.territory.plan')}>
        <Image source={{ uri: plan.url }} style={StyleSheet.absoluteFill} contentFit="fill" pointerEvents="none" />
        {pois.map((p) => (
          <Pin key={p.id} x={p.x_pct} y={p.y_pct} color={p.id === activeId ? c.warning : c.drop} onPress={onPoi ? () => onPoi(p) : undefined} label={String(p.id)} />
        ))}
        {draft && <Pin x={draft.x_pct} y={draft.y_pct} color={c.danger} big />}
      </Pressable>
      {onTap && <Text variant="caption" tone="muted">{t('san1.territory.tapHint')}</Text>}
    </View>
  );
}

function Pin({ x, y, color, onPress, label, big }: { x: number; y: number; color: string; onPress?: () => void; label?: string; big?: boolean }) {
  const size = big ? 34 : 26;
  // The pin's tip sits on the point: shift left by half the width and up by the full height.
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={6}
      accessibilityLabel={label}
      style={[styles.pin, { left: `${x}%`, top: `${y}%`, marginLeft: -size / 2, marginTop: -size }]}
    >
      <Icon name="mapPin" size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  box: { width: '100%', borderRadius: radii.md, borderWidth: 1, overflow: 'hidden' },
  pin: { position: 'absolute' },
});
