// Settings → «Bo'limlar»: the registrar switches whole sanatorium sections on and off. Every
// switch is saved at once (PATCH with the one changed key); a switched-off section disappears
// from the menus, tabs and buttons of every role.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/lib/toast';
import { Card, Text, Toggle } from '@/ui';
import { featuresQuery, useSaveFeatures } from '../../api/sections1';
import { QueryBlock, useSanReadOnly } from '../../components/common';
import { featureLabel, groupFeatures } from '../../utils/sections1';
import { sanErrorMessage } from '../../utils/sanatorium';

export function FeaturesPanel() {
  const { t, i18n } = useTranslation();
  const q = useQuery(featuresQuery());
  const save = useSaveFeatures();
  const readOnly = useSanReadOnly();
  const [pending, setPending] = useState<string | null>(null);

  const toggle = async (key: string, enabled: boolean) => {
    setPending(key);
    try {
      await save.mutateAsync({ [key]: enabled });
      toast.success(t('sanatorium.saved'));
    } catch (e) {
      toast.error(sanErrorMessage(e, t('errors.generic')));
    } finally {
      setPending(null);
    }
  };

  return (
    <QueryBlock query={q} rows={6}>
      {(rows) => (
        <View style={styles.stack} testID="features-panel">
          <Text variant="caption" tone="muted" testID="features-lead">{t('sanPlaces.feat.lead')}</Text>
          {groupFeatures(rows).map((g) => (
            <Card key={g.id} title={t(`sanPlaces.feat.group.${g.id}`)} testID={`feature-group-${g.id}`}>
              {g.rows.map((r) => (
                <View key={r.key} style={styles.row}>
                  <View style={styles.flex}>
                    <Text variant="body">{featureLabel(r, i18n.language)}</Text>
                  </View>
                  <Text variant="caption" tone="subtle" testID={`feature-${r.key}-state`}>{r.enabled ? t('sanPlaces.feat.on') : t('sanPlaces.feat.off')}</Text>
                  <Toggle
                    value={r.enabled}
                    disabled={readOnly || pending === r.key}
                    onValueChange={(v) => void toggle(r.key, v)}
                    accessibilityLabel={featureLabel(r, i18n.language)}
                    testID={`feature-${r.key}`}
                  />
                </View>
              ))}
            </Card>
          ))}
        </View>
      )}
    </QueryBlock>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
});
