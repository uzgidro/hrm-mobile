// «?»: the guest's way in six steps and the most frequent questions.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sheet, Text } from '@/ui';

const STEP_KEYS = ['accept', 'room', 'doctor', 'meal', 'check', 'route'] as const;
const QUESTIONS = ['q1', 'q2', 'q3', 'q4'] as const;

export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={open} onClose={onClose} title={t('sanSimple.help.title')} scroll>
      <View style={styles.help} testID="help-sheet">
        {STEP_KEYS.map((k, i) => (
          <View key={k} style={styles.row}>
            <Text variant="heading" tone="brand">{i + 1}</Text>
            <View style={styles.flex}>
              <Text variant="body" weight="600">{t(`sanSimple.help.${k}.title`)}</Text>
              <Text variant="caption" tone="muted">{t(`sanSimple.help.${k}.text`)}</Text>
            </View>
          </View>
        ))}
        <Text variant="heading">{t('sanFlow.help.qTitle')}</Text>
        {QUESTIONS.map((q) => <Text key={q} variant="body" tone="muted" testID={`help-${q}`}>• {t(`sanFlow.help.${q}`)}</Text>)}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  help: { gap: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
});
