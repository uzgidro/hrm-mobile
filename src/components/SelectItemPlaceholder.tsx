// Neutral detail-pane placeholder for split (master-detail) list screens:
// "pick something from the list". Deliberately NOT the EmptyState — that one
// carries the mascot and the list's own empty text, so on a 1366 split the same
// «… yo'q» message showed in BOTH panes (QA). Nothing is missing here; the user
// just hasn't selected a row yet.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/ui/Text';

export function SelectItemPlaceholder({ icon = 'doc' }: { icon?: IconName }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.center} testID="split-select-placeholder">
      <Icon name={icon} size={32} color={colors.fgSubtle} />
      <Text variant="body" tone="muted" style={styles.text}>
        {t('common.selectToView')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  text: { textAlign: 'center' },
});
