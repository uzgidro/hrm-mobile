// Turniket ortidagi ISAPI terminali (v2 `IsapiTerminalPanel`): HikCentral litsenziyasi tugagan qurilmalar
// o'z API'si orqali boshqariladi, shuning uchun platforma qiladigan ishlar shu yerdan qo'lda: ulanishni
// tekshirish, xodimlarni terminalga yozish (navbat, tasdiq bilan), hodisalarni hozir o'qish, noma'lum
// hisoblar (faqat o'qish). Terminal hisobi: login `GET /isapi-devices` dan, PAROL hech qayerdan
// qaytmaydi — maydon doim bo'sh, bo'sh saqlash = joriy parol qoladi; yangi hisob darhol sinaladi.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/api/errors';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { FormInput } from '@/components/FormInput';
import { Badge, Button, Text } from '@/ui';
import { isapiDevicesQuery } from '../api/queries';
import {
  useIsapiUnknownUsers,
  usePollIsapi,
  useSetIsapiCredentials,
  useSyncIsapiEmployees,
  useTestIsapi,
} from '../api/mutations';
import {
  buildCredentialsBody,
  isapiAddress,
  isapiPollOutcome,
  isapiTestOutcome,
  type IsapiUnknownUsers,
} from '../utils/turnstiles';

export function IsapiPanel({
  turnstileId,
  ip,
  port,
}: {
  turnstileId: number;
  ip?: string | null;
  port?: number | null;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const devices = useQuery(isapiDevicesQuery());
  const test = useTestIsapi();
  const poll = usePollIsapi();
  const sync = useSyncIsapiEmployees();
  const creds = useSetIsapiCredentials();
  const unknownQ = useIsapiUnknownUsers();
  const device = devices.data?.find((d) => d.id === turnstileId);
  // Qurilma porti (`GET /isapi-devices`), turniket qatoridagisi emas; bo'sh — server ulanadigan 80.
  const address = isapiAddress(device?.ip ?? ip, port, device?.port);
  // Login serverdan BIRINCHI kelganda olinadi, keyin operator qo'lida — fon yangilanishi yozilayotganni o'chirmaydi.
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [unknown, setUnknown] = useState<IsapiUnknownUsers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const login = username ?? device?.username ?? 'admin';
  const busy = test.isPending || poll.isPending || sync.isPending || creds.isPending || unknownQ.isPending;

  const runTest = async () => {
    try {
      const out = isapiTestOutcome(await test.mutateAsync(turnstileId));
      if (out.ok) toast.success(t('turnstiles.isapiTestOk', { model: out.text }));
      else toast.error(t('turnstiles.isapiTestFailed', { error: out.text }));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('turnstiles.actionFailed')));
    }
  };

  const runPoll = async () => {
    try {
      const out = isapiPollOutcome(await poll.mutateAsync(turnstileId));
      if (out.kind === 'busy') toast.info(out.detail || t('turnstiles.isapiBusy'));
      else toast.success(t('turnstiles.isapiPollDone', { pulled: out.pulled, created: out.created }));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('turnstiles.actionFailed')));
    }
  };

  const runSync = async () => {
    const ok = await confirm({
      title: t('turnstiles.isapiSyncEmployees'),
      message: address ?? undefined,
      confirmLabel: t('turnstiles.isapiSyncEmployees'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      await sync.mutateAsync(turnstileId);
      toast.success(t('turnstiles.isapiSyncQueued'));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('turnstiles.actionFailed')));
    }
  };

  const runUnknown = async () => {
    try {
      setUnknown(await unknownQ.mutateAsync(turnstileId));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t('turnstiles.actionFailed')));
    }
  };

  const saveCredentials = async () => {
    const r = buildCredentialsBody(login, password);
    if (!r.ok) return setError(t(r.error));
    try {
      await creds.mutateAsync({ id: turnstileId, body: r.body });
      setPassword('');
      toast.success(t('turnstiles.isapiCredsSaved'));
    } catch (e) {
      setError(getApiErrorMessage(e, t('turnstiles.actionFailed')));
    }
  };

  const unknownCodes = unknown?.unknown ?? [];

  return (
    <View style={styles.root}>
      <View style={[styles.box, { borderColor: c.border, backgroundColor: c.surface2 }]}>
        <Text variant="heading" testID="isapi-address">
          {address ?? '—'}
        </Text>
        <Text variant="caption" tone="muted">
          {t('turnstiles.isapiIntro')}
        </Text>
      </View>
      <Button
        testID="isapi-test"
        label={t('turnstiles.isapiTest')}
        variant="soft"
        onPress={() => void runTest()}
        loading={test.isPending}
        disabled={busy}
        full
      />
      <Button
        testID="isapi-sync"
        label={t('turnstiles.isapiSyncEmployees')}
        icon="users"
        variant="soft"
        onPress={() => void runSync()}
        loading={sync.isPending}
        disabled={busy}
        full
      />
      <Button
        testID="isapi-poll"
        label={t('turnstiles.isapiPoll')}
        icon="arrowDown"
        variant="soft"
        onPress={() => void runPoll()}
        loading={poll.isPending}
        disabled={busy}
        full
      />
      <Button
        testID="isapi-unknown"
        label={t('turnstiles.isapiUnknown')}
        icon="eye"
        variant="soft"
        onPress={() => void runUnknown()}
        loading={unknownQ.isPending}
        disabled={busy}
        full
      />
      {unknown && (
        <View style={[styles.box, { borderColor: c.border }]} testID="isapi-unknown-result">
          <Text variant="label">
            {t('turnstiles.isapiUnknownSummary', {
              total: unknown.total_on_device ?? 0,
              known: unknown.known ?? 0,
              unknown: unknown.unknown_count ?? unknownCodes.length,
            })}
          </Text>
          <Text variant="caption" tone="muted">
            {t('turnstiles.isapiUnknownHint')}
          </Text>
          {unknownCodes.length > 0 && (
            <View style={styles.codes}>
              {unknownCodes.map((code) => (
                <Badge key={code} label={code} />
              ))}
            </View>
          )}
        </View>
      )}
      <View style={[styles.account, { borderTopColor: c.border }]}>
        <Text variant="heading">{t('turnstiles.isapiAccount')}</Text>
        <FormInput
          testID="isapi-login"
          label={t('turnstiles.isapiLogin')}
          value={login}
          onChangeText={(v) => {
            setUsername(v);
            setError(null);
          }}
        />
        <FormInput
          testID="isapi-password"
          label={t('turnstiles.isapiNewPassword')}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError(null);
          }}
          secureTextEntry
        />
        <Text variant="caption" tone="subtle" style={styles.hint}>
          {t('turnstiles.isapiPasswordHint')}
        </Text>
        {!!error && (
          <Text variant="label" tone="danger" testID="isapi-creds-error">
            {error}
          </Text>
        )}
        <Button
          testID="isapi-save-creds"
          label={t('turnstiles.isapiSaveCreds')}
          onPress={() => void saveCredentials()}
          loading={creds.isPending}
          disabled={busy}
          full
        />
        <Text variant="caption" tone="subtle">
          {t('turnstiles.isapiCredsHint')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  box: { gap: 6, borderWidth: 1.5, borderRadius: radii.md, padding: 12 },
  codes: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  account: { gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 4 },
  hint: { marginTop: -12 },
});
