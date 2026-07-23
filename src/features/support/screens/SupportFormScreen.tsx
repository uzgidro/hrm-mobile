import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import type { PickedFile } from '@/components/AttachmentField';
import { AttachmentField } from '@/components/AttachmentField';
import { FormInput } from '@/components/FormInput';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getApiErrorMessage } from '@/api/errors';
import { ticketPriorityKey } from '@/utils/supportStatus';
import type { CreateTicketForm } from '../api/mutations';
import { useCreateTicket } from '../api/mutations';

const PRIORITIES: CreateTicketForm['priority'][] = ['urgent', 'normal', 'low'];

export default function SupportFormScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [priority, setPriority] = useState<CreateTicketForm['priority']>('normal');
  const [description, setDescription] = useState('');
  const [uge, setUge] = useState('');
  const [room, setRoom] = useState('');
  const [files, setFiles] = useState<PickedFile[]>([]);
  const createM = useCreateTicket();

  const MAX_FILES = 5; // backend rejects >5 (support_ticket service); block client-side like the web
  const pickFile = async () => {
    if (files.length >= MAX_FILES) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
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
      Alert.alert(t('support.actionError'), t('support.descriptionRequired'));
      return;
    }
    createM.mutate(
      { form: { priority, description, uge_number: uge, room_number: room }, files },
      {
        onSuccess: (ticket) => {
          Alert.alert(t('support.createdTitle'), t('support.createdMessage'));
          router.replace({ pathname: '/texnik-yordam-detail', params: { id: String(ticket.id) } });
        },
        onError: (e) => Alert.alert(t('support.actionError'), getApiErrorMessage(e, t('support.actionError'))),
      },
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title={t('support.createTitle')} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          onChangeText={setDescription}
          placeholder={t('support.descriptionPlaceholder')}
          multiline
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
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: 16, paddingBottom: 32, gap: 4 },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 8, marginTop: 4 },
    chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    chip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder },
    chipActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    chipTextActive: { color: c.primary },
    submitBtn: { marginTop: 16, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    submitText: { color: c.onPrimary, fontSize: 15, fontWeight: '700' },
  });
