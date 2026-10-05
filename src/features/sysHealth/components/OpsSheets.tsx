// Tizim boshqaruvi varaqlari (v2 `SystemOpsPanel` modallari): avariyaviy to'xtatish (sabab
// majburiy + majburiy/yumshoq), tiklashni bajarish (tranzaksiyalar: tegmaslik / bekor qilish)
// va server hisobotini so'zma-so'z ko'rsatish. Varaqning o'zi tasdiq: oqibat matn bilan yozilgan.
// Ota `key` bilan faqat ochiqda mount qiladi.
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { FormInput } from '@/components/FormInput';
import { Button, Chip, Sheet, Text, Toggle } from '@/ui';
import { useRunRecovery, useShutdownSystem } from '../api/mutations';
import { REASON_MAX, REASON_MIN, isReasonValid, prettyReport, type TxAction } from '../utils/sysHealth';

type Report = Record<string, unknown>;

export function ShutdownSheet({ onClose, onDone }: { onClose: () => void; onDone: (data: Report) => void }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [force, setForce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useShutdownSystem();
  const trimmed = reason.trim().length;

  const submit = async () => {
    if (!isReasonValid(reason)) return;
    try {
      onDone(await run.mutateAsync({ reason, force }));
    } catch (e) {
      setError(getApiErrorMessage(e, t('sysHealth.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={t('sysHealth.shutdown')}>
      <View style={styles.form}>
        <Text variant="label" tone="muted">
          {t('sysHealth.shutdownWarn')}
        </Text>
        <FormInput
          testID="sys-shutdown-reason"
          label={t('sysHealth.reason')}
          required
          multiline
          value={reason}
          onChangeText={(v) => {
            setReason(v.slice(0, REASON_MAX));
            setError(null);
          }}
          placeholder={t('sysHealth.reasonPlaceholder')}
          error={trimmed > 0 && trimmed < REASON_MIN ? t('sysHealth.reasonRequired') : undefined}
        />
        <View style={styles.switchRow}>
          <Text variant="body" style={styles.flex}>
            {t('sysHealth.force')}
          </Text>
          <Toggle
            testID="sys-shutdown-force"
            value={force}
            onValueChange={setForce}
            tone="danger"
          />
        </View>
        <Text variant="caption" tone={force ? 'danger' : 'subtle'}>
          {force ? t('sysHealth.forceHint') : t('sysHealth.softHint')}
        </Text>
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button
          testID="sys-shutdown-submit"
          label={t('sysHealth.shutdownConfirm')}
          icon="lock"
          variant="danger"
          size="lg"
          full
          disabled={!isReasonValid(reason)}
          loading={run.isPending}
          onPress={submit}
        />
      </View>
    </Sheet>
  );
}

export function RecoverySheet({ onClose, onDone }: { onClose: () => void; onDone: (data: Report) => void }) {
  const { t } = useTranslation();
  const [tx, setTx] = useState<TxAction>('keep');
  const [error, setError] = useState<string | null>(null);
  const run = useRunRecovery();

  const submit = async () => {
    try {
      onDone(await run.mutateAsync(tx));
    } catch (e) {
      setError(getApiErrorMessage(e, t('sysHealth.actionFailed')));
    }
  };

  return (
    <Sheet visible onClose={onClose} title={t('sysHealth.recoveryRun')}>
      <View style={styles.form}>
        <Text variant="label" tone="muted">
          {t('sysHealth.recoveryRunWarn')}
        </Text>
        <Text variant="label" tone="muted">
          {t('sysHealth.txAction')}
        </Text>
        <View style={styles.chips}>
          <Chip
            testID="sys-tx-keep"
            label={t('sysHealth.txKeep')}
            tintSelected
            selected={tx === 'keep'}
            onPress={() => setTx('keep')}
          />
          <Chip
            testID="sys-tx-rollback"
            label={t('sysHealth.txRollback')}
            tone="danger"
            tintSelected
            selected={tx === 'rollback'}
            onPress={() => setTx('rollback')}
          />
        </View>
        {tx === 'rollback' && (
          <Text variant="caption" tone="danger">
            {t('sysHealth.txRollbackWarn')}
          </Text>
        )}
        {!!error && (
          <Text variant="label" tone="danger">
            {error}
          </Text>
        )}
        <Button
          testID="sys-recovery-submit"
          label={t('sysHealth.recoveryRunConfirm')}
          icon="refresh"
          variant={tx === 'rollback' ? 'danger' : 'primary'}
          size="lg"
          full
          loading={run.isPending}
          onPress={submit}
        />
      </View>
    </Sheet>
  );
}

/** Server hisoboti — JSON so'zma-so'z (v2 `<pre>`), belgilab nusxa olish mumkin. */
export function OpsReportSheet({ title, data, onClose }: { title: string; data: unknown; onClose: () => void }) {
  const { colors: c } = useTheme();
  return (
    <Sheet visible onClose={onClose} title={title}>
      <ScrollView style={[styles.code, { backgroundColor: c.surface2, borderColor: c.border }]}>
        <Text variant="caption" tone="muted" selectable style={styles.mono} testID="sys-report">
          {prettyReport(data)}
        </Text>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  code: { maxHeight: 420, borderRadius: radii.sm, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
