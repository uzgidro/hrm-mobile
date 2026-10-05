// Turniket varag'i (v2 `TurnstileModal` tahrir rejimi tablari): «Turniket» — ma'lumot, tahrir va
// o'chirish (tasdiq bilan); «Eshiklar» — eshiklar va yo'nalish; «Terminal» — faqat ISAPI turniketida.
// Eshiklar va terminal turniket id si bilan ishlaydi, shuning uchun ular faqat mavjud yozuvda bor.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { Badge, Button, Segmented, Sheet } from '@/ui';
import { useDeleteTurnstile } from '../api/mutations';
import { isIsapi, isOnline, turnstileName, type TurnstileRow } from '../utils/turnstiles';
import { DoorsPanel } from './DoorsPanel';
import { IsapiPanel } from './IsapiPanel';
import { KeyValue } from './TurnstilesBits';

type Tab = 'info' | 'doors' | 'isapi';

export function TurnstileSheet({
  row,
  onEdit,
  onClose,
}: {
  row: TurnstileRow;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('info');
  const remove = useDeleteTurnstile();
  const online = isOnline(row.status);

  const del = async () => {
    const ok = await confirm({
      title: t('turnstiles.removeTitle'),
      message: t('turnstiles.removeConfirm', { name: row.acs_dev_name ?? '' }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success(t('turnstiles.deleted'));
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('turnstiles.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={turnstileName(row)}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Segmented
          testID="turnstile-tabs"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'info', label: t('turnstiles.infoTab') },
            { value: 'doors', label: t('turnstiles.doorsTab') },
            ...(isIsapi(row) ? [{ value: 'isapi' as const, label: t('turnstiles.isapiTab') }] : []),
          ]}
        />
        {tab === 'info' && (
          <>
            <View style={styles.badges}>
              <Badge
                testID="turnstile-sheet-status"
                label={online ? t('turnstiles.online') : t('turnstiles.offline')}
                tone={online ? 'success' : 'neutral'}
              />
              {!!row.treaty_type && <Badge label={row.treaty_type} />}
            </View>
            <KeyValue label={t('turnstiles.fieldIndexCode')} value={row.acs_dev_index_code} testID="turnstile-code" />
            <KeyValue label={t('turnstiles.fieldName')} value={row.acs_dev_name} />
            <KeyValue label={t('turnstiles.fieldIp')} value={row.acs_dev_ip} />
            <KeyValue
              label={t('turnstiles.fieldPort')}
              value={row.acs_dev_port != null ? String(row.acs_dev_port) : null}
            />
            <KeyValue label={t('turnstiles.fieldDevCode')} value={row.acs_dev_code} />
            <KeyValue
              label={t('turnstiles.fieldLocations')}
              value={(row.locations ?? []).map((l) => l.name || `#${l.id}`).join(', ')}
              testID="turnstile-locations"
            />
            <Button testID="turnstile-edit" label={t('common.edit')} icon="edit" onPress={onEdit} full />
            <Button
              testID="turnstile-delete"
              label={t('common.delete')}
              icon="trash"
              variant="dangerGhost"
              onPress={() => void del()}
              loading={remove.isPending}
              full
            />
          </>
        )}
        {tab === 'doors' && <DoorsPanel turnstileId={row.id} deviceIndexCode={row.acs_dev_index_code} />}
        {tab === 'isapi' && <IsapiPanel turnstileId={row.id} ip={row.acs_dev_ip} port={row.acs_dev_port} />}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 10, paddingBottom: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
