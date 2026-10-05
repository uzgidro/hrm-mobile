// v3 tugmasi: v2 pill shakli + Tomchi pastki «labi». Lab faqat to'liq rangli
// variantlarda (primary / danger / white) — bosilganda tugma LIP px pastga tushadi.
// soft / ghost — ikkinchi darajali, labsiz. dangerGhost — ikkinchi darajali buzuvchi amal
// (o'chirish / tugatish; v2 `danger-ghost`): fonsiz, qizil matn.
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { LIP, radii } from '@/theme/tokens';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'danger' | 'dangerGhost' | 'white';
const HEIGHT = { sm: 36, md: 44, lg: 52 } as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  full = false,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: keyof typeof HEIGHT;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  const inactive = disabled || loading;
  const skin: { bg: string; fg: string; lip?: string } = {
    primary: { bg: c.brand, fg: c.fgOnBrand, lip: c.brandLip },
    danger: { bg: c.dangerMark, fg: c.fgOnBrand, lip: c.danger },
    white: { bg: c.surface, fg: c.brandStrong, lip: c.border },
    soft: { bg: c.brandSoft, fg: c.brandStrong },
    ghost: { bg: 'transparent', fg: c.brandStrong },
    dangerGhost: { bg: 'transparent', fg: c.danger },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[full && styles.full, style]}
    >
      {({ pressed }) => {
        const down = pressed && !inactive && !!skin.lip;
        return (
          <View
            style={[
              styles.face,
              { height: HEIGHT[size], backgroundColor: skin.bg },
              skin.lip
                ? { borderBottomWidth: down ? 0 : LIP, borderBottomColor: skin.lip, marginTop: down ? LIP : 0 }
                : pressed && { opacity: 0.7 },
              inactive && styles.inactive,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={skin.fg} />
            ) : (
              <>
                {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} color={skin.fg} />}
                <Text variant="label" style={[styles.label, size === 'lg' && styles.labelLg, { color: skin.fg }]}>
                  {label}
                </Text>
              </>
            )}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  face: {
    borderRadius: radii.pill,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: { fontSize: 15, fontWeight: '700' },
  labelLg: { fontSize: 16 },
  inactive: { opacity: 0.5 },
});
