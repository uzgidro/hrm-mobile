// Small building blocks shared by the sections screens (part 1).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { confirm } from '@/lib/confirm';
import { EmptyState, IconButton, Text } from '@/ui';
import { useSanAccess, Denied } from '../common';
import { useSanFeatures, type SanFeatureKey } from '../../utils/features';
import type { SanRole } from '../../types';

/** Role + section-switch gate of a whole screen: no role = denied, switched off = a short note. */
export function SectionGate({ feature, roles, children }: { feature?: SanFeatureKey; roles: SanRole[]; children: React.ReactNode }) {
  const allowed = useSanAccess(...roles);
  const { on, loaded } = useSanFeatures();
  if (!allowed) return <Denied />;
  if (feature && loaded && !on(feature)) return <FeatureOff />;
  return <>{children}</>;
}

/** Shown instead of a screen whose section the registrar switched off. */
export function FeatureOff() {
  const { t } = useTranslation();
  return <EmptyState title={t('san1.featureOff')} message={t('san1.featureOffHint')} />;
}

/** Up / down arrows of a reorderable row. */
export function MoveButtons({ onUp, onDown, first, last, testID }: { onUp: () => void; onDown: () => void; first: boolean; last: boolean; testID?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.move}>
      <View style={first ? styles.off : undefined} pointerEvents={first ? 'none' : 'auto'}>
        <IconButton icon="arrowUp" tone="soft" accessibilityLabel={t('san1.moveUp')} onPress={onUp} testID={testID ? `${testID}-up` : undefined} />
      </View>
      <View style={last ? styles.off : undefined} pointerEvents={last ? 'none' : 'auto'}>
        <IconButton icon="arrowDown" tone="soft" accessibilityLabel={t('san1.moveDown')} onPress={onDown} testID={testID ? `${testID}-down` : undefined} />
      </View>
    </View>
  );
}

/** uz / ru / en variants of one text. Only Uzbek is required by the server. */
export function LangFields({
  label,
  values,
  onChange,
  multiline,
  requiredUz,
  testID,
}: {
  label: string;
  values: { uz: string; ru: string; en: string };
  onChange: (v: { uz: string; ru: string; en: string }) => void;
  multiline?: boolean;
  requiredUz?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.lang}>
      <Text variant="label" tone="muted">{label}</Text>
      {(['uz', 'ru', 'en'] as const).map((l) => (
        <FormInput
          key={l}
          label={l.toUpperCase()}
          value={values[l]}
          onChangeText={(v) => onChange({ ...values, [l]: v })}
          multiline={multiline}
          required={requiredUz && l === 'uz'}
          testID={testID ? `${testID}-${l}` : undefined}
        />
      ))}
    </View>
  );
}

/** Destructive confirmation with the standard labels. */
export function askDelete(t: (k: string) => string, title: string): Promise<boolean> {
  return confirm({ title, confirmLabel: t('sanatorium.remove'), cancelLabel: t('common.cancel'), destructive: true });
}

const styles = StyleSheet.create({
  move: { flexDirection: 'row', gap: 0 },
  off: { opacity: 0.3 },
  lang: { gap: 2, marginTop: 4 },
});
