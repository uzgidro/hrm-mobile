// One-field sheet (new section / rename section): a title, an input and a save button.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { Button, Sheet } from '@/ui';

export function PromptSheet({
  title,
  label,
  initial = '',
  placeholder,
  submitLabel,
  busy,
  onSubmit,
  onClose,
  testID,
}: {
  title: string;
  label: string;
  initial?: string;
  placeholder?: string;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (value: string) => void;
  onClose: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  return (
    <Sheet visible onClose={onClose} title={title}>
      <View style={styles.body}>
        <FormInput label={label} value={value} onChangeText={setValue} placeholder={placeholder} required testID={testID} />
        <Button
          testID={testID ? `${testID}-submit` : undefined}
          label={submitLabel ?? t('common.save')}
          loading={busy}
          disabled={!value.trim()}
          onPress={() => onSubmit(value.trim())}
          full
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 4, paddingBottom: 8 },
});
