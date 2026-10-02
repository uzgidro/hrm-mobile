// Suzuvchi asosiy amal tugmasi (yangi yozuv): binafsha doira + Tomchi labi,
// o'ng pastki burchakda (safe-area hisobga olinadi). Ekranda bittadan ortiq bo'lmaydi.
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { LIP, radii, shadow } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';

export function Fab({
  onPress,
  accessibilityLabel,
  icon = 'plus',
  testID,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  icon?: IconName;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { bottom: 24 + insets.bottom, backgroundColor: c.brand, borderBottomColor: c.brandLip, borderBottomWidth: pressed ? 0 : LIP },
        pressed && { marginBottom: -LIP },
        shadow('md', c),
      ]}
    >
      <Icon name={icon} size={26} color={c.fgOnBrand} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
