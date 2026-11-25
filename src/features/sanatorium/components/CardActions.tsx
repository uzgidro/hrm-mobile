// Web-only helpers of the credentials card: copy a value to the clipboard and print the card.
// On native the codes are `selectable` text instead, so both render nothing there.
import React from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { toast } from '@/lib/toast';
import { Button } from '@/ui';

const webClipboard = (): { writeText: (s: string) => Promise<void> } | undefined =>
  Platform.OS === 'web' ? (globalThis as { navigator?: { clipboard?: { writeText: (s: string) => Promise<void> } } }).navigator?.clipboard : undefined;

export function CopyButton({ value, testID }: { value: string; testID?: string }) {
  const { t } = useTranslation();
  const clip = webClipboard();
  if (!clip) return null;
  return (
    <Button
      testID={testID}
      label={t('sanGuests.copy')}
      variant="soft"
      size="sm"
      onPress={() => void clip.writeText(value).then(() => toast.success(t('sanGuests.copied'))).catch(() => {})}
    />
  );
}

export function PrintButton({ testID }: { testID?: string }) {
  const { t } = useTranslation();
  if (Platform.OS !== 'web') return null;
  return (
    <Button
      testID={testID}
      label={t('sanGuests.print')}
      variant="soft"
      full
      onPress={() => (globalThis as { print?: () => void }).print?.()}
    />
  );
}
