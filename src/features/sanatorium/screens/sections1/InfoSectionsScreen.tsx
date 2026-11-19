// Info sections (registrar): the «about the sanatorium» cards the Telegram bot and the guest
// cabinet show. Texts in uz / ru / en, an emoji, a photo, order and where each one is shown.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { UploadFile } from '@/api/formFile';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { radii } from '@/theme/tokens';
import { Badge, Button, EmptyState, ListRow, PageHeader, Screen, Sheet, Text } from '@/ui';
import {
  infoSectionsQuery, useDeleteInfoPhoto, useDeleteInfoSection, useReorderInfoSections, useSaveInfoSection, useUploadInfoPhoto,
} from '../../api/sections1';
import { QueryBlock } from '../../components/common';
import { ErrorLine, optNull, SwitchRow } from '../../components/forms';
import { askDelete, LangFields, MoveButtons, SectionGate } from '../../components/sections1/shared';
import type { InfoSection } from '../../types1';
import { pickImage } from '../../utils/pickImage';
import { moveId, pickLang } from '../../utils/sections1';
import { sanErrorMessage } from '../../utils/sanatorium';

export default function InfoSectionsScreen() {
  const { t, i18n } = useTranslation();
  const q = useQuery(infoSectionsQuery());
  const reorder = useReorderInfoSections();
  const [edit, setEdit] = useState<InfoSection | 'new' | null>(null);
  return (
    <SectionGate feature="info_sections" roles={['registrar']}>
      <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-info-screen">
        <PageHeader title={t('san1.info.title')} right={<Button testID="info-add" label={t('sanatorium.add')} icon="plus" size="sm" onPress={() => setEdit('new')} />} />
        <QueryBlock query={q}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState title={t('san1.info.empty')} />
            ) : (
              <View style={styles.stack}>
                {items.map((s, i) => (
                  <ListRow
                    key={s.id}
                    pressable
                    testID={`info-${s.id}`}
                    left={s.photo ? <Image source={{ uri: s.photo.thumb_url }} style={styles.thumb} contentFit="cover" /> : s.emoji ? <Text variant="title">{s.emoji}</Text> : undefined}
                    title={pickLang(i18n.language, { uz: s.title_uz, ru: s.title_ru, en: s.title_en })}
                    subtitle={[s.show_in_bot ? t('san1.info.inBot') : null, s.show_in_cabinet ? t('san1.info.inCabinet') : null].filter(Boolean).join(' · ') || undefined}
                    right={
                      <View style={styles.row}>
                        {!s.is_active && <Badge label={t('sanatorium.inactive')} tone="neutral" />}
                        <MoveButtons
                          first={i === 0}
                          last={i === items.length - 1}
                          testID={`info-${s.id}`}
                          onUp={() => reorder.mutate(moveId(items.map((x) => x.id), s.id, -1), { onError: (e) => toast.error(sanErrorMessage(e, t('errors.generic'))) })}
                          onDown={() => reorder.mutate(moveId(items.map((x) => x.id), s.id, 1), { onError: (e) => toast.error(sanErrorMessage(e, t('errors.generic'))) })}
                        />
                      </View>
                    }
                    onPress={() => setEdit(s)}
                  />
                ))}
              </View>
            )
          }
        </QueryBlock>
        <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? t('san1.info.add') : t('san1.info.edit')} scroll>
          {edit && <InfoForm key={edit === 'new' ? 'new' : edit.id} item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
        </Sheet>
      </Screen>
    </SectionGate>
  );
}

function InfoForm({ item, onClose }: { item: InfoSection | null; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveInfoSection();
  const del = useDeleteInfoSection();
  const upload = useUploadInfoPhoto();
  const delPhoto = useDeleteInfoPhoto();
  const [title, setTitle] = useState({ uz: item?.title_uz ?? '', ru: item?.title_ru ?? '', en: item?.title_en ?? '' });
  const [body, setBody] = useState({ uz: item?.body_uz ?? '', ru: item?.body_ru ?? '', en: item?.body_en ?? '' });
  const [emoji, setEmoji] = useState(item?.emoji ?? '');
  const [bot, setBot] = useState(item?.show_in_bot ?? true);
  const [cabinet, setCabinet] = useState(item?.show_in_cabinet ?? true);
  const [active, setActive] = useState(item?.is_active ?? true);
  const [photo, setPhoto] = useState<UploadFile | null>(null);
  const [dropPhoto, setDropPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = photo?.uri ?? (!dropPhoto ? item?.photo?.thumb_url : undefined);

  const choose = async () => {
    try {
      const r = await pickImage();
      if (!r) return;
      if ('denied' in r) return toast.error(t('sanatorium.photoPermission'));
      setPhoto(r.file);
      setDropPhoto(false);
    } catch (e) {
      toast.error(sanErrorMessage(e, t('errors.generic')));
    }
  };

  const submit = async () => {
    if (title.uz.trim().length < 2) return setError(t('sanatorium.nameShort'));
    try {
      const saved = await save.mutateAsync({
        id: item?.id,
        body: {
          title_uz: title.uz.trim(),
          title_ru: optNull(title.ru),
          title_en: optNull(title.en),
          body_uz: body.uz.trim(),
          body_ru: optNull(body.ru),
          body_en: optNull(body.en),
          emoji: optNull(emoji),
          show_in_bot: bot,
          show_in_cabinet: cabinet,
          is_active: active,
        },
      });
      // The photo needs the section id, so it follows the save.
      if (photo) await upload.mutateAsync({ id: saved.id, file: photo });
      else if (dropPhoto && item?.photo) await delPhoto.mutateAsync(saved.id);
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  const remove = async () => {
    if (!item || !(await askDelete(t, t('san1.info.delete')))) return;
    try {
      await del.mutateAsync(item.id);
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.form} testID="info-sheet">
      <LangFields label={t('san1.info.titleLabel')} values={title} onChange={setTitle} requiredUz testID="info-title" />
      <LangFields label={t('san1.info.body')} values={body} onChange={setBody} multiline testID="info-body" />
      <FormInput label={t('san1.info.emoji')} value={emoji} onChangeText={setEmoji} testID="info-emoji" />
      {!!shown && <Image source={{ uri: shown }} style={styles.preview} contentFit="cover" />}
      <View style={styles.row}>
        <Button testID="info-photo" label={shown ? t('san1.info.changePhoto') : t('san1.info.addPhoto')} icon="camera" variant="soft" size="sm" onPress={() => void choose()} />
        {!!shown && <Button testID="info-photo-del" label={t('sanatorium.remove')} variant="dangerGhost" size="sm" onPress={() => { setPhoto(null); setDropPhoto(true); }} />}
      </View>
      <SwitchRow label={t('san1.info.showInBot')} value={bot} onChange={setBot} testID="info-bot" />
      <SwitchRow label={t('san1.info.showInCabinet')} value={cabinet} onChange={setCabinet} testID="info-cabinet" />
      <SwitchRow label={t('sanatorium.active')} value={active} onChange={setActive} />
      <ErrorLine message={error} testID="info-error" />
      <Button testID="info-save" label={t('common.save')} full loading={save.isPending || upload.isPending} onPress={() => void submit()} />
      {item && <Button testID="info-delete" label={t('sanatorium.remove')} variant="dangerGhost" full loading={del.isPending} onPress={() => void remove()} />}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  form: { gap: 6, paddingBottom: 8 },
  thumb: { width: 44, height: 44, borderRadius: radii.sm },
  preview: { width: '100%', aspectRatio: 16 / 9, borderRadius: radii.md },
});
