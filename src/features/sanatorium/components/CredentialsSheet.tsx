// The guest's ID + password, shown ONCE. The caller keeps them only in transient state and
// clears it on close; nothing here is stored, logged or cached.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Sheet, Text } from '@/ui';
import type { Credentials } from '../types';

export type CredentialsShown = { guestName: string; credentials: Credentials | null };

export function CredentialsSheet({ creds, onClose }: { creds: CredentialsShown | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={!!creds} onClose={onClose} title={t('sanatorium.credentials')}>
      <View style={styles.body} testID="credentials-sheet">
        <Text variant="body" weight="600">{creds?.guestName}</Text>
        {creds?.credentials ? (
          <>
            <Text variant="label" tone="danger">{t('sanatorium.credentialsOnce')}</Text>
            <View style={styles.row}>
              <Text variant="caption" tone="muted">{t('sanatorium.loginCode')}</Text>
              <Text variant="display" selectable testID="cred-login">{creds.credentials.login_code}</Text>
            </View>
            <View style={styles.row}>
              <Text variant="caption" tone="muted">{t('sanatorium.password')}</Text>
              <Text variant="display" selectable testID="cred-password">{creds.credentials.password}</Text>
            </View>
          </>
        ) : (
          <Text variant="body" testID="cred-none">{t('sanatorium.credentialsNone')}</Text>
        )}
        <Button label={t('sanatorium.credentialsDone')} full onPress={onClose} testID="cred-done" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({ body: { gap: 10, paddingBottom: 8 }, row: { gap: 2 } });
