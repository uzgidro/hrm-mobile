// Doctor scans the patient's code (24 digits, `90…`): resolve → the card. The resolved card is
// put straight into the cache, so the card screen opens without a second (journalled) request.
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AccessDenied } from '@/components/AccessDenied';
import { getApiErrorMessage } from '@/api/errors';
import { useAuthStore } from '@/store/authStore';
import { PageHeader, Screen } from '@/ui';
import { useResolveQr } from '../api/mutations';
import { examKeys } from '../api/queries';
import { CodeScanner } from '../components/CodeScanner';
import { apiErrorCode, classifyMedicalCode, normalizeMedicalCode } from '../utils/codes';
import { isDoctor } from '../utils/medicalExam';

export default function DoctorScanScreen() {
  const { t } = useTranslation();
  const allowed = isDoctor(useAuthStore((s) => s.user));
  const qc = useQueryClient();
  const resolve = useResolveQr();
  const [message, setMessage] = useState<string | null>(null);

  const onCode = useCallback(
    async (raw: string) => {
      const kind = classifyMedicalCode(raw);
      if (kind !== 'employee') {
        setMessage(kind === 'door' ? t('medicalExam.scanPatient.doorCode') : t('medicalExam.scanPatient.notPatient'));
        return;
      }
      try {
        const card = await resolve.mutateAsync(normalizeMedicalCode(raw)!);
        qc.setQueryData(examKeys.card(card.employee.id), card);
        router.replace({ pathname: '/doctor-patient', params: { id: String(card.employee.id) } });
      } catch (e) {
        setMessage(
          apiErrorCode(e) === 'medical_qr_invalid'
            ? t('medicalExam.scanPatient.notPatient')
            : getApiErrorMessage(e, t('medicalExam.scanPatient.failed')),
        );
      }
    },
    [resolve, qc, t],
  );

  if (!allowed) return <AccessDenied title={t('medicalExam.desk.title')} />;
  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <PageHeader title={t('medicalExam.scanPatient.title')} subtitle={t('medicalExam.scanPatient.subtitle')} />
      <View style={styles.flex}>
        <CodeScanner
          hint={t('medicalExam.scanPatient.hint')}
          busy={resolve.isPending}
          message={message}
          onCode={(raw) => void onCode(raw)}
          onRetry={() => setMessage(null)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
