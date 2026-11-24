// The home screen's design, in its editor: what is picked is shown at once by the editor itself.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TextSizePicker } from '@/components/TextSizePicker';
import { Icon } from '@/components/Icon';
import { ACCENTS, GROUNDS, accentFill, type Accent } from '@/theme/accents';
import { CARD_STYLES } from '@/theme/CardLook';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Chip, Text } from '@/ui';
import { DEFAULT_GAP, DEFAULT_RADIUS, HOME_GAPS, HOME_RADII, readLook, type HomeLook } from '../../board/homeLook';

export function DesignCard({ value, onChange }: { value?: HomeLook; onChange: (look: HomeLook | undefined) => void }) {
  const { t } = useTranslation();
  // `readLook` drops what equals the default, so going back to it is not a change.
  const set = (patch: Partial<HomeLook>) => onChange(readLook({ ...value, ...patch }));
  return (
    <Card title={t('dashboard.customise.design')} icon="sun" tint="orange" testID="customise-design">
      <View style={styles.list}>
        <Choice label={t('dashboard.customise.bg')}>
          {GROUNDS.map((g) => (
            <Chip key={g} testID={`bg-${g}`} label={t(`dashboard.customise.bg_${g}`)} selected={(value?.bg ?? 'plain') === g} onPress={() => set({ bg: g })} />
          ))}
        </Choice>
        <Choice label={t('dashboard.customise.accent')}>
          <Swatches value={value?.accent} onChange={(accent) => set({ accent })} />
        </Choice>
        <Choice label={t('dashboard.customise.cards')}>
          {CARD_STYLES.map((s) => (
            <Chip key={s} testID={`card-${s}`} label={t(`dashboard.customise.card_${s}`)} selected={(value?.card ?? 'soft') === s} onPress={() => set({ card: s })} />
          ))}
        </Choice>
        <Choice label={t('dashboard.customise.corners')}>
          {HOME_RADII.map((r) => (
            <Chip key={r} testID={`radius-${r}`} label={t(`dashboard.customise.radius_${r}`)} selected={(value?.radius ?? DEFAULT_RADIUS) === r} onPress={() => set({ radius: r })} />
          ))}
        </Choice>
        <Choice label={t('dashboard.customise.spacing')}>
          {HOME_GAPS.map((g) => (
            <Chip key={g} testID={`gap-${g}`} label={t(`dashboard.customise.gap_${g}`)} selected={(value?.gap ?? DEFAULT_GAP) === g} onPress={() => set({ gap: g })} />
          ))}
        </Choice>
        <Choice label={t('profile.textSize')}>
          <View style={styles.full}>
            <TextSizePicker />
          </View>
        </Choice>
        <Button
          testID="design-reset"
          label={t('dashboard.customise.designReset')}
          icon="refresh"
          variant="neutral"
          size="sm"
          disabled={!value}
          onPress={() => onChange(undefined)}
        />
      </View>
    </Card>
  );
}

function Choice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.choice}>
      <Text variant="label" tone="muted" weight="600">
        {label}
      </Text>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

/** Accent colours; the first one takes the colour away again. */
export function Swatches({ value, onChange }: { value?: Accent; onChange: (a: Accent | undefined) => void }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  return (
    <>
      <Chip testID="accent-none" label={t('dashboard.customise.accentNone')} selected={!value} onPress={() => onChange(undefined)} />
      {ACCENTS.map((a) => (
        <Pressable
          key={a}
          testID={`accent-${a}`}
          accessibilityRole="button"
          accessibilityState={{ selected: value === a }}
          accessibilityLabel={t(`dashboard.customise.accent_${a}`)}
          hitSlop={4}
          onPress={() => onChange(a)}
          style={[styles.swatch, { backgroundColor: accentFill(a) }, value === a && { borderColor: c.fg, borderWidth: 2.5 }]}
        >
          {value === a ? <Icon name="check" size={18} strokeWidth={3} color={c.fgOnBrand} /> : null}
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: 16 },
  choice: { gap: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  full: { width: '100%' },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
