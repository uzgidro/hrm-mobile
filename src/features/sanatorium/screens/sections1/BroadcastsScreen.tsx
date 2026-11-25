// Broadcasts (registrar): a message to a guest group through the Telegram bot, with audience
// counts before sending, an optional photo, and the history with live progress.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { UploadFile } from '@/api/formFile';
import { confirm } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { radii } from '@/theme/tokens';
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar, Screen, Sheet, Text } from '@/ui';
import { audiencesQuery, broadcastsQuery, useSendBroadcast, useUploadBroadcastPhoto } from '../../api/sections1';
import { QueryBlock, useSanReadOnly } from '../../components/common';
import { ChoiceField, ErrorLine, optNull } from '../../components/forms';
import { LangFields, SectionGate } from '../../components/sections1/shared';
import { BROADCAST_AUDIENCES, type Broadcast, type BroadcastAudience } from '../../types1';
import { pickImage } from '../../utils/pickImage';
import { broadcastProgress } from '../../utils/sections1';
import { fmtDateTime, sanErrorMessage } from '../../utils/sanatorium';

const MAX_TEXT = 3500;

export default function BroadcastsScreen() {
  const { t } = useTranslation();
  const q = useQuery(broadcastsQuery());
  const readOnly = useSanReadOnly();
  const [compose, setCompose] = useState(false);
  return (
    <SectionGate feature="broadcasts" roles={['registrar']}>
      <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-broadcasts-screen">
        <PageHeader title={t('san1.broadcast.title')} right={readOnly ? undefined : <Button testID="bc-new" label={t('san1.broadcast.new')} icon="plus" size="sm" onPress={() => setCompose(true)} />} />
        <QueryBlock query={q}>
          {(d) =>
            d.items.length === 0 ? (
              <EmptyState title={t('san1.broadcast.empty')} />
            ) : (
              <View style={styles.stack}>{d.items.map((b) => <BroadcastCard key={b.id} b={b} />)}</View>
            )
          }
        </QueryBlock>
        <Sheet visible={compose} onClose={() => setCompose(false)} title={t('san1.broadcast.new')} scroll>
          {compose && <ComposeForm onClose={() => setCompose(false)} />}
        </Sheet>
      </Screen>
    </SectionGate>
  );
}

const statusTone = (s: Broadcast['status']) => (s === 'done' ? 'success' : s === 'sending' ? 'warning' : 'info');

function BroadcastCard({ b }: { b: Broadcast }) {
  const { t } = useTranslation();
  return (
    <Card testID={`bc-${b.id}`}>
      <View style={styles.row}>
        <Text variant="heading" style={styles.flex}>{t(`san1.broadcast.audience.${b.audience}`)}</Text>
        <Badge label={t(`san1.broadcast.status.${b.status}`)} tone={statusTone(b.status)} />
      </View>
      <Text variant="body" numberOfLines={4}>{b.text_uz}</Text>
      <Text variant="caption" tone="muted">{fmtDateTime(b.created_at)}</Text>
      {b.status !== 'queued' || b.queued_count > 0 ? <ProgressBar value={broadcastProgress(b)} /> : null}
      <Text variant="caption" tone="muted">
        {`${t('san1.broadcast.sent')}: ${b.sent_count} · ${t('san1.broadcast.failed')}: ${b.failed_count} · ${t('san1.broadcast.skipped')}: ${b.skipped_count} · ${t('san1.broadcast.total')}: ${b.total_count}`}
      </Text>
    </Card>
  );
}

function ComposeForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const counts = useQuery(audiencesQuery());
  const send = useSendBroadcast();
  const uploadPhoto = useUploadBroadcastPhoto();
  const [audience, setAudience] = useState<BroadcastAudience>('in_house');
  const [text, setText] = useState({ uz: '', ru: '', en: '' });
  const [photo, setPhoto] = useState<UploadFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const c = counts.data?.[audience];

  const choose = async () => {
    try {
      const r = await pickImage();
      if (!r) return;
      if ('denied' in r) return toast.error(t('sanatorium.photoPermission'));
      setPhoto(r.file);
    } catch (e) {
      toast.error(sanErrorMessage(e, t('errors.generic')));
    }
  };

  const submit = async () => {
    if (!text.uz.trim()) return setError(t('san1.broadcast.textRequired'));
    if (text.uz.length > MAX_TEXT || text.ru.length > MAX_TEXT || text.en.length > MAX_TEXT) return setError(t('san1.broadcast.textTooLong', { max: MAX_TEXT }));
    const ok = await confirm({
      title: t('san1.broadcast.confirmTitle'),
      message: t('san1.broadcast.confirmText', { count: c?.reachable ?? 0 }),
      confirmLabel: t('san1.broadcast.send'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    try {
      const up = photo ? await uploadPhoto.mutateAsync(photo) : null;
      await send.mutateAsync({
        audience,
        text_uz: text.uz.trim(),
        text_ru: optNull(text.ru),
        text_en: optNull(text.en),
        ...(up ? { photo_key: up.photo_key } : {}),
      });
      toast.success(t('san1.broadcast.queued'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.form} testID="broadcast-sheet">
      <ChoiceField
        label={t('san1.broadcast.audienceLabel')}
        value={audience}
        options={BROADCAST_AUDIENCES.map((a) => ({
          value: a as BroadcastAudience,
          label: t(`san1.broadcast.audience.${a}`),
          sub: counts.data?.[a] ? `${t('san1.broadcast.reachable')}: ${counts.data[a].reachable} / ${counts.data[a].total}` : undefined,
        }))}
        onChange={(v) => v && setAudience(v)}
        loading={counts.isPending}
        testID="bc-audience"
      />
      {c && (
        <Text variant="caption" tone="muted" testID="bc-counts">
          {`${t('san1.broadcast.reachable')}: ${c.reachable} · ${t('san1.broadcast.skipped')}: ${c.skipped} · ${t('san1.broadcast.total')}: ${c.total}`}
        </Text>
      )}
      <LangFields label={t('san1.broadcast.text')} values={text} onChange={setText} multiline requiredUz testID="bc-text" />
      <Text variant="caption" tone="muted">{t('san1.broadcast.langHint')}</Text>
      {photo && <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" />}
      <View style={styles.row}>
        <Button testID="bc-photo" label={photo ? t('san1.info.changePhoto') : t('san1.info.addPhoto')} icon="camera" variant="soft" size="sm" onPress={() => void choose()} />
        {photo && <Button label={t('sanatorium.remove')} variant="dangerGhost" size="sm" onPress={() => setPhoto(null)} />}
      </View>
      <ErrorLine message={error} testID="bc-error" />
      <Button testID="bc-send" label={t('san1.broadcast.send')} full icon="mail" loading={send.isPending || uploadPhoto.isPending} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1 },
  form: { gap: 6, paddingBottom: 8 },
  preview: { width: '100%', aspectRatio: 16 / 9, borderRadius: radii.md },
});
