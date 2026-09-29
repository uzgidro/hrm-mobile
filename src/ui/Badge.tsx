// Kichik status yorlig'i (Kelgan / Kech / Kirdi …): yumshoq fon + asosiy rang matn.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Text } from './Text';
import { toneColors, type Tone } from './Chip';

export function Badge({ label, tone = 'neutral', testID }: { label: string; tone?: Tone; testID?: string }) {
  const { colors: c } = useTheme();
  const t = toneColors(c, tone);
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: t.soft }]}>
      <Text variant="caption" style={[styles.text, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  text: { fontWeight: '600' },
});
