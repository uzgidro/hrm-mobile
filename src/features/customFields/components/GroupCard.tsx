// Bitta bo'lim (guruh) kartasi: sarlavha qatori (nom, izoh, «O'chirilgan» nishoni) va ichidagi maydonlar
// (nom + «*» majburiy bo'lsa, kalit; tur, «Ro'yxatda», «O'chirilgan» nishonlari — telefonda nom ostida,
// keng ekranda o'ngda). Sarlavha faqat yozish huquqi bo'lsa bosiladi (amallar varag'i); maydon qatori
// har doim — tafsilot varag'i.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBreakpoint } from '@/utils/responsive';
import { Badge, Card, ListRow, Text } from '@/ui';
import type { CustomField, CustomFieldGroup } from '../utils/customFields';
import { useTypeLabels } from './CustomFieldsBits';

export function GroupCard({
  group,
  canWrite,
  onGroup,
  onField,
}: {
  group: CustomFieldGroup;
  canWrite: boolean;
  onGroup: () => void;
  onField: (f: CustomField) => void;
}) {
  const { t } = useTranslation();
  const compact = useBreakpoint().sizeClass === 'compact';
  const { typeLabel } = useTypeLabels();
  const fields = group.fields ?? [];

  const fieldBadges = (f: CustomField) => (
    <View style={styles.badges}>
      <Badge label={typeLabel(f.field_type)} />
      {!!f.show_in_list && <Badge label={t('customFields.inList')} tone="info" />}
      {f.is_active === false && <Badge label={t('customFields.inactive')} />}
    </View>
  );

  return (
    <Card testID={`cf-group-${group.id}`}>
      <ListRow
        testID={`cf-group-row-${group.id}`}
        title={group.title || `#${group.id}`}
        subtitle={group.description || undefined}
        below={
          group.is_active === false ? (
            <View style={styles.badges}>
              <Badge label={t('customFields.inactive')} />
            </View>
          ) : undefined
        }
        chevron={canWrite}
        onPress={canWrite ? onGroup : undefined}
      />
      {fields.length === 0 ? (
        <Text variant="caption" tone="subtle" style={styles.none}>
          {t('customFields.noFields')}
        </Text>
      ) : (
        fields.map((f) => (
          <ListRow
            key={f.id}
            testID={`cf-field-row-${f.id}`}
            title={f.label || f.key || `#${f.id}`}
            titleAddon={
              f.is_required ? (
                <Text variant="heading" tone="danger" accessibilityLabel={t('customFields.requiredLabel')}>
                  *
                </Text>
              ) : undefined
            }
            subtitle={f.key || undefined}
            below={compact ? fieldBadges(f) : undefined}
            right={compact ? undefined : fieldBadges(f)}
            chevron
            onPress={() => onField(f)}
          />
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  none: { paddingVertical: 8 },
});
