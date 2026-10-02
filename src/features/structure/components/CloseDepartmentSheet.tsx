// Bo'limni qisqartirish (TZ 4.2.6 «сокращение») — o'chirish EMAS: bo'lim tarixda
// qoladi, faqat yangi tayinlashlarda taklif qilinmaydi. Sabab ixtiyoriy.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { FormInput } from '@/components/FormInput';
import { Button, Sheet, Text } from '@/ui';
import type { Department } from '../api/queries';
import { useCloseDepartment } from '../api/mutations';

/** Ota `key={dept.id}` bilan faqat ochiqda mount qiladi — holat har safar toza. */
export function CloseDepartmentSheet({ dept, onClose }: { dept: Department; onClose: () => void }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const close = useCloseDepartment();

  const submit = async () => {
    try {
      await close.mutateAsync({ id: dept.id, reason });
      toast.success(t('structure.closedDone'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={t('structure.closeTitle')}>
      <View style={styles.form}>
        <Text variant="label">{dept.name}</Text>
        <Text variant="body" tone="muted">
          {t('structure.closeHint')}
        </Text>
        <FormInput
          testID="structure-close-reason"
          label={t('structure.closeReason')}
          value={reason}
          onChangeText={(v) => {
            setReason(v);
            setError(null);
          }}
        />
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button
          testID="structure-close-confirm"
          label={t('structure.close')}
          variant="danger"
          onPress={submit}
          loading={close.isPending}
          full
          size="lg"
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({ form: { gap: 12, paddingBottom: 8 } });
