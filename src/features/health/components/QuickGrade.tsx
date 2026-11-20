// One-tap grading on a roster row (2026-11-20 simplification). «Sog'lom» is saved
// at once; «E'tibor» and «Kasal» open the grade sheet with that status chosen,
// because they usually need a note or a period — and a stray tap on «Kasal» must
// not silently take a driver off the road. The current grade is shown filled.
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Text, toneColors } from '@/ui';
import { HEALTH_STATUSES, STATUS_TONE, type HealthStatus } from '../utils/health';

const ICON: Record<HealthStatus, IconName> = { good: 'check', limited: 'eye', unfit: 'close' };

export function QuickGrade({
  employeeId,
  name,
  current,
  busy,
  stretch,
  onPick,
}: {
  employeeId: number;
  name: string;
  current?: string | null;
  busy?: boolean;
  /** Phone: the three buttons share the row width under the name. */
  stretch?: boolean;
  onPick: (status: HealthStatus) => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  return (
    <View style={[styles.row, stretch && styles.stretch]}>
      {HEALTH_STATUSES.map((s) => {
        const tone = toneColors(c, STATUS_TONE[s] ?? 'neutral');
        const on = current === s;
        const fg = on ? c.fgOnBrand : tone.fg;
        return (
          <Pressable
            key={s}
            testID={`health-quick-${s}-${employeeId}`}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled: !!busy }}
            accessibilityLabel={t('health.quickA11y', { name, status: t(`health.status_${s}`) })}
            disabled={busy}
            hitSlop={4}
            onPress={() => onPick(s)}
            style={({ pressed }) => [
              styles.btn,
              stretch && styles.btnStretch,
              {
                backgroundColor: on ? tone.fg : tone.soft,
                borderColor: tone.fg,
                opacity: pressed ? 0.7 : busy ? 0.6 : 1,
              },
            ]}
          >
            {busy && s === 'good' ? (
              <ActivityIndicator size="small" color={fg} />
            ) : (
              <Icon name={ICON[s]} size={16} color={fg} strokeWidth={2.4} />
            )}
            <Text variant="label" numberOfLines={1} style={{ color: fg }}>
              {t(`health.short_${s}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  stretch: { marginTop: 8 },
  btn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnStretch: { flex: 1, paddingHorizontal: 6 },
});
