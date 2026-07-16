import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import dayjs from 'dayjs';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { LoadingView } from '@/components/StateViews';
import { AttachmentField, type PickedFile } from '@/components/AttachmentField';
import { DatePickerModal } from '@/components/DatePicker';
import { getApiErrorMessage } from '@/api/errors';
import { Field, Selector } from '../components/FormParts';
import { letterDetailQuery } from '../api/queries';
import { useSubmitReport, uploadReport } from '../api/mutations';

// Business-trip report submission (xizmat safari, OLD flow — web LetterReportDrawer).
// Four fields: date (optional), summary (optional), task (optional), content
// (required). An optional single file may be attached via upload-report. When
// the trip is already `report_submitted` the report is prefilled and this edits
// it. report_number is never sent — the backend auto-assigns it.
export default function SubmitReportScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const letterId = Number(id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: letter, isLoading, refetch } = useQuery(letterDetailQuery(letterId));
  const submit = useSubmitReport(letterId);

  const isEditing = letter?.status === 'report_submitted';
  const [hydrated, setHydrated] = useState(false);
  const [reportDate, setReportDate] = useState('');
  const [summary, setSummary] = useState('');
  const [task, setTask] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [datePicker, setDatePicker] = useState(false);
  const [busy, setBusy] = useState(false);

  // Prefill once from the retained report fields — whether editing a still-
  // submitted report OR fixing a returned one (the backend keeps the prior
  // report on return, so re-typing everything would be a needless UX tax).
  if (letter && !hydrated && (letter.report_content || letter.report_summary || letter.report_task)) {
    setReportDate(letter.report_date ?? '');
    setSummary(letter.report_summary ?? '');
    setTask(letter.report_task ?? '');
    setContent(letter.report_content ?? '');
    setHydrated(true);
  }

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType });
  };

  const canSubmit = !!content.trim() && !busy;

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert(t('letters.validationTitle'), t('letters.reportContentRequired'));
      return;
    }
    setBusy(true);
    try {
      await submit.mutateAsync({
        report_date: reportDate || undefined,
        report_summary: summary || undefined,
        report_task: task || undefined,
        report_content: content.trim(),
      });
      // Optional file is best-effort — a failed upload must not undo the report.
      if (file) {
        try {
          await uploadReport(letterId, file);
        } catch {
          Alert.alert(t('letters.actionDoneTitle'), t('letters.reportFileFailed'));
        }
      }
      refetch();
      router.back();
    } catch (e) {
      Alert.alert(t('letters.actionError'), getApiErrorMessage(e, t('letters.reportSubmitError')));
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !letter) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Header title={t('letters.reportTitle')} styles={styles} colors={colors} />
        <LoadingView />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? t('letters.reportEditTitle') : t('letters.reportTitle')}</Text>
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {busy ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.submitBtnText}>{t('letters.reportSend')}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {letter.status === 'report_returned' && !!letter.return_reason && (
          <View style={styles.returnedCard}>
            <Text style={styles.returnedTitle}>{t('letters.reportReturnedReason')}</Text>
            <Text style={styles.returnedText}>{letter.return_reason}</Text>
          </View>
        )}

        <Field label={t('letters.reportDate')}>
          <Selector
            text={reportDate ? dayjs(reportDate).format('DD.MM.YYYY') : undefined}
            placeholder={t('letters.placeholderSelectDate')}
            onPress={() => setDatePicker(true)}
          />
        </Field>

        <Field label={t('letters.reportSummary')}>
          <TextInput
            style={styles.input}
            value={summary}
            onChangeText={setSummary}
            placeholder={t('letters.reportSummaryPlaceholder')}
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label={t('letters.reportTask')}>
          <TextInput
            style={styles.input}
            value={task}
            onChangeText={setTask}
            placeholder={t('letters.reportTaskPlaceholder')}
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label={t('letters.reportContent')} required>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={content}
            onChangeText={setContent}
            placeholder={t('letters.reportContentPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
        </Field>

        <AttachmentField
          label={t('letters.reportAttachment')}
          files={file ? [file] : []}
          onPick={pickFile}
          onRemove={() => setFile(null)}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      <DatePickerModal
        visible={datePicker}
        value={reportDate || null}
        title={t('letters.reportDate')}
        onConfirm={setReportDate}
        onClose={() => setDatePicker(false)}
      />
    </SafeAreaView>
  );
}

function Header({ title, styles, colors }: { title: string; styles: Styles; colors: ThemeColors }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
        <Icon name="chevronLeft" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    title: { flex: 1, fontSize: 17, fontWeight: '800', color: c.text, textAlign: 'center' },
    submitBtn: { minWidth: 80, height: 38, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: c.onPrimary, fontWeight: '700', fontSize: 14 },

    content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },

    returnedCard: {
      marginTop: 16, backgroundColor: c.errorSoft, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: c.error,
    },
    returnedTitle: { fontSize: 13, fontWeight: '700', color: c.error, marginBottom: 4 },
    returnedText: { fontSize: 13, color: c.text, lineHeight: 19 },

    input: {
      backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.cardBorder,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.text,
    },
    textArea: { minHeight: 140 },
  });
