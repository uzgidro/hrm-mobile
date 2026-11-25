// The guest's route sheet («Yo'l varaqasi»): steps in the guest's order with a tick for what is done,
// plus a compact stepper for the stay screen. Texts come from the server in the app language.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/ui';
import { fmtDateTime } from '../../utils/sanatorium';
import type { RouteSheet, RouteStep } from '../types';
import { stepText, stepTitle, textLang } from '../utils';

function Tick({ done }: { done: boolean }) {
  const { colors: c } = useTheme();
  return <Icon name={done ? 'check' : 'clock'} size={16} color={done ? c.success : c.fgSubtle} />;
}

/** One line per step: «✓ Xona · 12 · A blok». */
export function RouteStepper({ steps }: { steps: RouteStep[] }) {
  const { i18n } = useTranslation();
  const lang = textLang(i18n.language);
  return (
    <View style={styles.stepper} testID="route-stepper">
      {steps.map((s) => (
        <View key={s.key} style={styles.chip} testID={`route-step-${s.key}`}>
          <Tick done={s.done} />
          <Text variant="caption" weight={s.done ? '500' : '700'}>{stepTitle(s, lang)}</Text>
        </View>
      ))}
    </View>
  );
}

export function RouteSheetBody({ sheet }: { sheet: RouteSheet }) {
  const { i18n, t } = useTranslation();
  const lang = textLang(i18n.language);
  return (
    <View style={styles.body} testID="route-sheet">
      {sheet.steps.map((s, i) => {
        const bits = [s.place, s.at ? fmtDateTime(s.at) : null, s.person].filter(Boolean);
        return (
          <View key={s.key} style={styles.row} testID={`route-row-${s.key}`}>
            <Text variant="heading" tone="brand" style={styles.num}>{i + 1}</Text>
            <View style={styles.flex}>
              <View style={styles.titleRow}>
                <Text variant="body" weight="700" style={styles.flex}>{stepTitle(s, lang)}</Text>
                <Tick done={s.done} />
              </View>
              {!!stepText(s, lang) && <Text variant="caption" tone="muted">{stepText(s, lang)}</Text>}
              {bits.length > 0 && <Text variant="label">{bits.join(' · ')}</Text>}
            </View>
          </View>
        );
      })}
      {!!sheet.contacts && <Text variant="caption" tone="muted">{t('sanSimple.route.contacts')}: {sheet.contacts}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stepper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  body: { gap: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  num: { width: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
