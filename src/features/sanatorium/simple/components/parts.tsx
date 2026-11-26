// Small blocks of the simple flow: a big pressable choice, a coloured note with an action, a fold-out
// block, the money input and the words for rooms and times.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { toneColors, type Tone } from '@/ui/Chip';
import { Badge, Button, Text } from '@/ui';
import { fmtMoney, todayIso } from '../../utils/sanatorium';

export type ChoiceBadge = { label: string; tone?: Tone };

/** One option of a step: the whole card is the button. */
export function ChoiceCard({
  on, title, hint, extra, icon, badges = [], disabled = false, left, onPress, testID,
}: {
  on: boolean;
  title: string;
  hint?: string | null;
  extra?: string | null;
  icon?: IconName;
  badges?: ChoiceBadge[];
  disabled?: boolean;
  /** Something before the text (a room photo). */
  left?: React.ReactNode;
  onPress: () => void;
  testID?: string;
}) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: on, checked: on, disabled }}
      accessibilityLabel={title}
      testID={testID}
      style={[styles.choice, { backgroundColor: on ? c.brandSoft : c.surface, borderColor: on ? c.brand : c.border, opacity: disabled ? 0.55 : 1 }]}
    >
      {left}
      {!!icon && !left && <Icon name={icon} size={22} color={on ? c.brandStrong : c.fgMuted} />}
      <View style={styles.flex}>
        <Text variant="body" weight="700">{title}</Text>
        {badges.length > 0 && (
          <View style={styles.badges}>
            {badges.map((b) => <Badge key={b.label} label={b.label} tone={b.tone ?? 'neutral'} />)}
          </View>
        )}
        {!!hint && <Text variant="caption" tone="muted">{hint}</Text>}
        {!!extra && <Text variant="caption" tone="subtle">{extra}</Text>}
      </View>
      {on && <Icon name="check" size={20} color={c.brandStrong} />}
    </Pressable>
  );
}

export function Note({ tone = 'info', children, action, testID }: { tone?: Tone; children: string; action?: { label: string; onPress: () => void; testID?: string }; testID?: string }) {
  const { colors: c } = useTheme();
  const t = toneColors(c, tone);
  return (
    <View style={[styles.note, { backgroundColor: t.soft }]} testID={testID}>
      <Text variant="label" style={{ color: t.fg }}>{children}</Text>
      {!!action && <Button label={action.label} size="sm" variant="white" onPress={action.onPress} testID={action.testID} style={styles.noteBtn} />}
    </View>
  );
}

/** Rare fields stay folded until somebody needs them. */
export function MoreBlock({ title, children, testID }: { title: string; children: React.ReactNode; testID?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Button label={`${open ? '−' : '+'} ${title}`} variant="link" size="sm" onPress={() => setOpen((v) => !v)} testID={testID} style={styles.noteBtn} />
      {open && children}
    </View>
  );
}

export const onlyDigits = (v: string, max = 11) => v.replace(/\D/g, '').slice(0, max);
/** Whole sums: shown with thousands separators, kept as plain digits. */
export function MoneyInput({ label, value, onChange, testID }: { label: string; value: string; onChange: (v: string) => void; testID?: string }) {
  return <FormInput label={label} value={value ? fmtMoney(value) : ''} placeholder="0" keyboardType="number-pad" onChangeText={(v) => onChange(onlyDigits(v))} testID={testID} />;
}

/** «Bugun 10:20», «Ertaga 10:20», «26.11 10:20». */
export function useWhen(): (iso: string) => string {
  const { t } = useTranslation();
  return (iso) => {
    const d = dayjs(iso);
    const day = d.format('YYYY-MM-DD');
    const today = todayIso();
    const prefix = day === today ? t('sanatorium.today') : day === dayjs(today).add(1, 'day').format('YYYY-MM-DD') ? t('sanFlow.common.tomorrow') : d.format(d.year() === dayjs().year() ? 'DD.MM' : 'DD.MM.YYYY');
    return `${prefix} ${d.format('HH:mm')}`;
  };
}

type RoomLike = { number: string; building?: string | null; floor?: number | null };
/** «101-xona · Asosiy korpus, 1-qavat». */
export function useRoomText(): (r: RoomLike) => string {
  const { t } = useTranslation();
  return (r) => {
    const where = [r.building, r.floor != null ? t('sanFlow.common.floorN', { n: r.floor }) : null].filter(Boolean).join(', ');
    return [t('sanFlow.common.roomN', { n: r.number }), where].filter(Boolean).join(' · ');
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.lg, borderWidth: 1.5, minHeight: 56 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 2 },
  note: { padding: 12, borderRadius: radii.md, gap: 8 },
  noteBtn: { alignSelf: 'flex-start' },
});
