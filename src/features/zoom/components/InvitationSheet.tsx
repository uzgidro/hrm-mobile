// «Ochildi — mana yuboriladigan matn» (v2 InvitationModal): yaratilgandan keyin bir marta,
// faqat server qo'shilish havolasini qaytargan bo'lsa. v2 matnni clipboard'ga ham yozadi —
// mobil'da clipboard native dep talab qiladi, shuning uchun tizimning «Ulashish» oynasi.
import React from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, Sheet, Text } from '@/ui';
import { buildInvitation, formatMeetingId, type ZoomMeeting } from '../utils/zoom';

export function InvitationSheet({ meeting, onClose }: { meeting: ZoomMeeting; onClose: () => void }) {
  const { t } = useTranslation();
  const text = buildInvitation(meeting, t);
  const share = async () => {
    try {
      await Share.share({ message: text });
    } catch {
      // Bekor qilindi — jim.
    }
  };
  return (
    <Sheet visible onClose={onClose} title={t('zoom.createdTitle')}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <View>
          <Text variant="heading">{meeting.topic || '—'}</Text>
          <Text variant="caption" tone="muted">
            {`${t('zoom.invId')}: ${formatMeetingId(meeting.zoom_meeting_id)}${
              meeting.passcode ? ` · ${t('zoom.invPasscode')}: ${meeting.passcode}` : ''
            }`}
          </Text>
        </View>
        <Text variant="label" tone="muted">
          {t('zoom.invitationText')}
        </Text>
        <Card testID="zoom-invitation-text">
          <Text variant="caption" selectable>
            {text}
          </Text>
        </Card>
        <Text variant="caption" tone="subtle">
          {t('zoom.shareInvitationHint')}
        </Text>
        <Button testID="zoom-invitation-share" label={t('zoom.shareInvitation')} onPress={() => void share()} full />
        <Button label={t('common.close')} variant="neutral" onPress={onClose} full />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  body: { gap: 12, paddingBottom: 8 },
});
