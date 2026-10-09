import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import type { PickedFile } from '@/components/AttachmentField';
import { AttachmentField } from '@/components/AttachmentField';
import { FormInput } from '@/components/FormInput';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Screen } from '@/components/Screen';
import { getApiErrorMessage } from '@/api/errors';
import { ticketPriorityKey } from '@/utils/supportStatus';
import type { CreateTicketForm } from '../api/mutations';
import { useCreateTicket } from '../api/mutations';
import { useFormDraft } from '@/lib/formDraft';
import { DraftPrompt } from '@/components/DraftPrompt';
import { toast } from '@/lib/toast';
import { ensureMediaLibraryAccess } from '@/lib/mediaLibraryAccess';

const PRIORITIES: CreateTicketForm['priority'][] = ['urgent', 'normal', 'low'];

export default function SupportFormScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [priority, setPriority] = useState<CreateTicketForm['priority']>('normal');
  const [description, setDescription] = useState('');
  // Inline «Tavsif» error (the OS Alert showed nothing on web).
  const [descError, setDescError] = useState<string | undefined>(undefined);
  const [uge, setUge] = useState('');
  const [room, setRoom] = useState('');
  const [files, setFiles] = useState<PickedFile[]>([]);
  const createM = useCreateTicket();

  // Autosaved while typing; offered back on the next open (files excluded).
  const draft = useFormDraft(
    'support-ticket',
    { priority, description, uge, room },
    {
      enabled: true,
      dirty: description.trim() !== '' || uge.trim() !== '' || room.trim() !== '',
      onRestore: (d) => { setPriority(d.priority); setDescription(d.description); setUge(d.uge); setRoom(d.room); },
    },
  );

  const MAX_FILES = 5; // backend rejects >5 (support_ticket service); block client-side like the web
  const pickFile = async () => {
    if (files.length >= MAX_FILES) return;
    if (!(await ensureMediaLibraryAccess())) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.6,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const name = a.fileName || a.uri.split('/').pop() || 'file';
    setFiles((prev) => [...prev, { uri: a.uri, name, mimeType: a.mimeType }]);
  };

  const submit = () => {
    if (!description.trim()) {
      setDescError(t('support.descriptionRequired'));
      return;
    }
    setDescError(undefined);
    createM.mutate(
      { form: { priority, description, uge_number: uge, room_number: room }, files },
      {
        onSuccess: (ticket) => {
          void draft.clear();
          toast.success(t('support.createdMessage'));
          router.replace({ pathname: '/texnik-yordam-detail', params: { id: String(ticket.id) } });
        },
        onError: (e) => toast.error(getApiErrorMessage(e, t('support.actionError'))),
      },
    );
  };

  return (
    <Screen edges={['top', 'bottom']} maxWidth={600}>
      <ScreenHeader title={t('support.createTitle')} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <DraftPrompt visible={draft.pendingDraft != null} onRestore={draft.restore} onDiscard={draft.discard} />
        <Text style={styles.label}>{t('support.priorityLabel')}</Text>
        <View style={styles.chips}>
          {PRIORITIES.map((p) => {
            const active = p === priority;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setPriority(p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(ticketPriorityKey(p))}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FormInput
          label={t('support.descriptionLabel')}
          required
          value={description}
          onChangeText={(v) => { setDescription(v); if (descError && v.trim()) setDescError(undefined); }}
          placeholder={t('support.descriptionPlaceholder')}
          multiline
          error={descError}
          testID="support-description"
        />
        <FormInput label={t('support.ugeLabel')} value={uge} onChangeText={setUge} placeholder={t('support.ugePlaceholder')} />
        <FormInput label={t('support.roomLabel')} value={room} onChangeText={setRoom} placeholder={t('support.roomPlaceholder')} />

        <AttachmentField
          label={t('support.filesLabel')}
          files={files}
          onPick={pickFile}
          onRemove={(i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={createM.isPending} activeOpacity={0.85}>
          {createM.isPending
            ? <ActivityIndicator color={colors.onPrimary} />
            : <Text style={styles.submitText}>{t('support.submit')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 32, gap: 4 },
    label: { fontSize: 13, ...ff('700'), color: c.textSecondary, marginBottom: 8, marginTop: 4 },
    chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    chip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: c.card, borderWidth: 2, borderColor: c.cardBorder },
    chipActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    chipText: { fontSize: 13, ...ff('700'), color: c.textSecondary },
    chipTextActive: { color: c.primary },
    submitBtn: { marginTop: 16, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: c.primaryShadow },
    submitText: { color: c.onPrimary, fontSize: 15, ...ff('800') },
  });
