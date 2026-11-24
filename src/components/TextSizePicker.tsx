// The whole app's text size: five steps, applied on the tap — the page itself is the preview.
// Profile → appearance, and the home screen's design card.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { pickTextSize } from '@/lib/textSizeSync';
import { TEXT_SIZE_STEPS, useTextSizeStore } from '@/store/textSizeStore';
import { Text } from '@/ui/Text';

export function TextSizePicker() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const current = useTextSizeStore((s) => s.id);
  const own = TEXT_SIZE_STEPS.find((s) => s.id === current)?.scale ?? 1;
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('profile.textSize')}>
      {TEXT_SIZE_STEPS.map((s) => {
        const on = s.id === current;
        const percent = Math.floor(s.scale * 100);
        return (
          <Pressable
            key={s.id}
            testID={`text-size-${s.id}`}
            onPress={() => pickTextSize(s.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={t('profile.textSizeStep', { percent })}
            style={[styles.step, { borderColor: on ? c.brand : c.border, backgroundColor: on ? c.brandSoft : c.surface }]}
          >
            {/* Drawn at the size of its own step whichever one is on. */}
            <Text
              weight="800"
              maxFontSizeMultiplier={1}
              style={{ fontSize: (16 * s.scale) / own, lineHeight: (22 * s.scale) / own, color: on ? c.brandStrong : c.fg }}
            >
              A
            </Text>
            <Text variant="caption" maxFontSizeMultiplier={1} numberOfLines={1} style={[styles.percent, { color: on ? c.brandStrong : c.fgMuted }]}>
              {String(percent)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  step: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  percent: { fontVariant: ['tabular-nums'] },
});
