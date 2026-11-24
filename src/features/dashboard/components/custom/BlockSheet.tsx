// One block's own name, colour and (for a note) text.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { Button, Sheet, Text } from '@/ui';
import { customOf, type HomeBlockKey } from '../../board/homeBlocks';
import { TEXT_MAX, TITLE_MAX, type BlockLook } from '../../board/homeLook';
import { Swatches } from './DesignCard';
import { useBlockName } from './customBlocks';

export function BlockSheet({
  block,
  value,
  onChange,
  onClose,
}: {
  /** `null` — closed. */
  block: HomeBlockKey | null;
  value?: BlockLook;
  onChange: (look: BlockLook) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const name = useBlockName();
  if (!block) return null;
  const custom = customOf(block);
  const set = (patch: Partial<BlockLook>) => onChange({ ...value, ...patch });
  return (
    <Sheet visible onClose={onClose} title={name(block, value)} scroll>
      <View style={styles.body}>
        {custom ? (
          <FormInput
            testID="block-title"
            label={t('dashboard.customise.blockName')}
            value={value?.title ?? ''}
            placeholder={name(block)}
            onChangeText={(s) => set({ title: s.slice(0, TITLE_MAX) || undefined })}
          />
        ) : null}
        {custom?.kind === 'note' ? (
          <FormInput
            testID="block-text"
            label={t('dashboard.customise.noteText')}
            value={value?.text ?? ''}
            multiline
            onChangeText={(s) => set({ text: s.slice(0, TEXT_MAX) || undefined })}
          />
        ) : null}
        <Text variant="label" tone="muted" weight="600">
          {t('dashboard.customise.blockColor')}
        </Text>
        <View style={styles.swatches}>
          <Swatches value={value?.accent} onChange={(accent) => set({ accent })} />
        </View>
        <Button testID="block-done" label={t('common.done')} onPress={onClose} style={styles.done} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
  done: { marginTop: 18 },
});
