// «Xona QR-kodini skanerlash» — the employee scans the code on a cabinet door and joins that
// queue. A door code is 24 digits starting with `91`. Anything else (including the employee's
// own code, which starts with `90`) is refused HERE, without calling the server.
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { toast } from '@/lib/toast';
import { PageHeader, Screen, Text } from '@/ui';
import { useJoinQueue } from '../api/mutations';
import { examKeys } from '../api/queries';
import { CodeScanner } from '../components/CodeScanner';
import { joinedSpecialty, type Visit } from '../utils/medicalExam';
import { apiErrorCode, classifyMedicalCode, normalizeMedicalCode } from '../utils/codes';

export default function ScanDoorScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const join = useJoinQueue();
  const [message, setMessage] = useState<string | null>(null);

  const onCode = useCallback(
    async (raw: string) => {
      const kind = classifyMedicalCode(raw);
      if (kind !== 'door') {
        setMessage(kind === 'employee' ? t('medicalExam.scanDoor.ownCode') : t('medicalExam.scanDoor.notDoor'));
        return;
      }
      try {
        const prev = qc.getQueryData<Visit | null>(examKeys.myVisit());
        const visit = await join.mutateAsync(normalizeMedicalCode(raw)!);
        // The server answers with the updated visit only: name the queue from what changed.
        const specialty = joinedSpecialty(prev, visit);
        toast.success(
          specialty ? t('medicalExam.scanDoor.joined', { specialty }) : t('medicalExam.scanDoor.joinedGeneric'),
        );
        router.back();
      } catch (e) {
        setMessage(
          apiErrorCode(e) === 'medical_qr_invalid'
            ? t('medicalExam.scanDoor.notDoor')
            : getApiErrorMessage(e, t('medicalExam.scanDoor.failed')),
        );
      }
    },
    [join, qc, t],
  );

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <PageHeader title={t('medicalExam.scanDoor.title')} subtitle={t('medicalExam.scanDoor.subtitle')} />
      <View style={styles.flex}>
        <CodeScanner
          hint={t('medicalExam.scanDoor.hint')}
          busy={join.isPending}
          message={message}
          onCode={(raw) => void onCode(raw)}
          onRetry={() => setMessage(null)}
        />
      </View>
      <Text variant="caption" tone="muted" style={styles.foot}>
        {t('medicalExam.scanDoor.foot')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  foot: { textAlign: 'center', paddingVertical: 8 },
});
