// What else can stand on the home screen: module lists and page buttons, limited to the pages
// the account may open.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState, IconButton, SearchField, Segmented, Sheet, Text } from '@/ui';
import { CUSTOM_MAX, blockDef, customOf, offeredKeys, type HomeBlockKey, type HomeBoardKind } from '../../board/homeBlocks';
import { useAuthStore } from '@/store/authStore';
import { foldText } from '@/utils/searchFold';
import { BlockRow } from '../SortableBlocks';

type Kind = 'mod' | 'page';

export function AddSheet({
  board,
  blocks,
  visible,
  onClose,
  onToggle,
}: {
  board: HomeBoardKind;
  blocks: readonly HomeBlockKey[];
  visible: boolean;
  onClose: () => void;
  onToggle: (key: HomeBlockKey) => void;
}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [kind, setKind] = useState<Kind>('mod');
  const [term, setTerm] = useState('');
  const name = (k: HomeBlockKey) => String(t(blockDef(k)!.titleKey));
  const q = foldText(term.trim());
  const offered = offeredKeys(kind, user, board).filter((k) => !q || foldText(name(k)).includes(q));
  const used = blocks.filter((k) => customOf(k)?.kind === kind).length;
  const full = used >= CUSTOM_MAX[kind];
  return (
    <Sheet visible={visible} onClose={onClose} title={t('dashboard.customise.addTitle')} scroll>
      <View style={styles.body}>
        <Segmented<Kind>
          testID="add-kind"
          options={[
            { value: 'mod', label: t('dashboard.customise.kindList') },
            { value: 'page', label: t('dashboard.customise.kindButton') },
          ]}
          value={kind}
          onChange={setKind}
        />
        <SearchField value={term} onChangeText={setTerm} placeholder={t('common.search')} testID="add-search" />
        <Text variant="caption" tone="subtle">
          {t(full ? 'dashboard.customise.limitReached' : 'dashboard.customise.limit', { used, max: CUSTOM_MAX[kind] })}
        </Text>
        {offered.length === 0 ? <EmptyState title={t('common.notFound')} /> : null}
        <View>
          {offered.map((k) => {
            const on = blocks.includes(k);
            return (
              <BlockRow key={k} block={k} plain>
                <IconButton
                  icon={on ? 'check' : 'plus'}
                  testID={`toggle-${k}`}
                  accessibilityLabel={t(on ? 'dashboard.customise.remove' : 'dashboard.customise.add', { name: name(k) })}
                  disabled={!on && full}
                  onPress={() => onToggle(k)}
                />
              </BlockRow>
            );
          })}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({ body: { gap: 12, paddingBottom: 8 } });
