// Metrika tile'i (Kann + v2 StatTile): modul rangidagi yumshoq wash, katta raqam
// Nunito 900 (rangi DOIM fg — kontrast), burchakda xira katta ikonka. Bosiladigan
// bo'lsa — Tomchi labi (1.5px border + pastki LIP).
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { LIP, moduleTint, radii, type ModuleTintKey } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from './Text';
import { ProgressBar } from './ProgressBar';

export function StatTile({
  label,
  value,
  sub,
  icon,
  tint,
  progress,
  onPress,
  style,
  testID,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: IconName;
  tint: ModuleTintKey;
  progress?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  const t = moduleTint(c, tint);
  const body = (pressed: boolean) => (
    <View
      style={[
        styles.tile,
        { backgroundColor: t.wash },
        onPress && {
          borderWidth: 1.5,
          borderColor: `${t.fg}40`,
          borderBottomWidth: pressed ? 1.5 : LIP + 1.5,
          marginTop: pressed ? LIP : 0,
        },
      ]}
    >
      <View style={styles.corner} pointerEvents="none">
        <Icon name={icon} size={56} color={t.fg} />
      </View>
      <View style={[styles.iconBox, { backgroundColor: t.fg }]}>
        <Icon name={icon} size={16} color={c.fgOnBrand} />
      </View>
      <Text variant="label" tone="muted" numberOfLines={1} style={styles.label}>
        {label}
      </Text>
      <Text variant="number" tone="fg" numberOfLines={1}>
        {String(value)}
      </Text>
      {sub ? (
        <Text variant="caption" tone="subtle" numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
      {progress !== undefined && (
        <View style={styles.progress}>
          <ProgressBar value={progress} color={t.fg} height={4} />
        </View>
      )}
    </View>
  );

  if (!onPress) {
    return (
      <View testID={testID} style={style}>
        {body(false)}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={style}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radii.xl, padding: 14, minHeight: 128, overflow: 'hidden' },
  corner: { position: 'absolute', right: -6, top: -6, opacity: 0.18 },
  iconBox: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  label: { marginBottom: 2 },
  progress: { marginTop: 10 },
});
