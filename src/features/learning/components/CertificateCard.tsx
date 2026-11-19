// The certificate a finished enrollment earns (web v2 `CertificateCard`). The
// web prints it; on the phone it is shown here and shared as text through the
// system share sheet (the same data is on the employee's K4 training record).
import React from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Button, Text } from '@/ui';
import type { EnrollmentDetail } from '../api/queries';
import { fmtDate } from '../utils/learning';

export function CertificateCard({ enrollment: e }: { enrollment: EnrollmentDetail & { employee_name?: string | null } }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const rows = [
    e.hours ? `${t('learning.certHours')}: ${e.hours}` : null,
    e.completed_at ? `${t('learning.certDate')}: ${fmtDate(e.completed_at)}` : null,
    e.certificate_expires_at ? `${t('learning.certValidTo')}: ${fmtDate(e.certificate_expires_at)}` : null,
    e.score != null ? `${t('learning.score')}: ${e.score}%` : null,
  ].filter(Boolean) as string[];

  const share = () => {
    const message = [
      `${t('learning.certificate')} № ${e.certificate_number ?? ''}`,
      e.employee_name ? `${t('learning.certAwardedTo')}: ${e.employee_name}` : null,
      `${t('learning.certForCourse')} «${e.course_title ?? ''}»`,
      ...rows,
      e.provider || t('learning.internalCourse'),
    ]
      .filter(Boolean)
      .join('\n');
    void Share.share({ message }).catch(() => undefined);
  };

  return (
    <View testID="certificate-card" style={[styles.card, { borderColor: c.warningMark, backgroundColor: c.surface }]}>
      <View style={[styles.seal, { backgroundColor: c.warningSoft }]}>
        <Icon name="graduation" size={28} color={c.warning} />
      </View>
      <Text variant="caption" tone="muted" style={styles.center}>
        {e.provider || t('learning.internalCourse')}
      </Text>
      <Text variant="title" style={styles.center}>
        {t('learning.certificate')}
      </Text>
      {!!e.employee_name && (
        <>
          <Text variant="caption" tone="subtle" style={styles.center}>
            {t('learning.certAwardedTo')}
          </Text>
          <Text variant="heading" style={styles.center}>
            {e.employee_name}
          </Text>
        </>
      )}
      <Text variant="caption" tone="subtle" style={styles.center}>
        {t('learning.certForCourse')}
      </Text>
      <Text variant="heading" style={styles.center}>{`«${e.course_title ?? ''}»`}</Text>
      {rows.length > 0 && (
        <Text variant="caption" tone="muted" style={styles.center}>
          {rows.join(' · ')}
        </Text>
      )}
      <Text variant="label" style={styles.center} testID="certificate-number">
        {`${t('learning.certNumber')}: ${e.certificate_number ?? '—'}`}
      </Text>
      <Button label={t('learning.shareCertificate')} icon="globe" variant="soft" onPress={share} testID="certificate-share" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 18, borderRadius: radii.xl, borderWidth: 2, alignItems: 'stretch' },
  seal: { alignSelf: 'center', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  center: { textAlign: 'center' },
});
