// Topshiriq sahifasining bo'laklari: izoh yozish («@» bilan belgilash, fayl),
// sabab/izoh formalari, fayllar ro'yxati va xronologiya (web v2 TaskDetail).
import React, { useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { UploadFile } from '@/api/formFile';
import { getApiErrorMessage } from '@/api/errors';
import { DatePickerModal } from '@/components/DatePicker';
import { FormInput } from '@/components/FormInput';
import { Icon } from '@/components/Icon';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { ff } from '@/theme/typography';
import { Avatar, Badge, Button, IconButton, SelectField, Text } from '@/ui';
import {
  fileSize,
  insertMention,
  mentionIds,
  mentionQuery,
  opensInViewer,
  type ChronoAttachment,
  type ChronoEvent,
  type ChronoExtension,
  type ChronoFile,
  type ChronoPerson,
} from '../utils/chrono';

const fmt = (d?: string | null) => (d ? dayjs(d).format('DD.MM.YYYY') : '—');
const fmtTime = (d?: string | null) => (d ? dayjs(d).format('DD.MM.YY HH:mm') : '');

/* ─────────────────────────── files ─────────────────────────── */

/** Pick files on the phone (up to 10). */
export async function pickFiles(): Promise<UploadFile[]> {
  const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return [];
  return res.assets.slice(0, 10).map((a) => ({
    uri: a.uri,
    name: a.name,
    mimeType: a.mimeType,
    file: (a as { file?: Blob }).file ?? null,
  }));
}

/**
 * PDF / Word / Excel / PowerPoint open in OnlyOffice (view only); anything
 * else — zip, rar, pictures — opens in the browser, which downloads it under
 * its own name (the object key ends with the original file name).
 */
export function openChronoFile(f: Pick<ChronoAttachment, 'id' | 'original_filename' | 'url'>) {
  if (opensInViewer(f.original_filename)) {
    router.push(`/topshiriq-fayl?id=${f.id}&name=${encodeURIComponent(f.original_filename)}`);
    return;
  }
  if (f.url) void Linking.openURL(f.url);
}

export function FileChips({ files }: { files: ChronoAttachment[] }) {
  const { colors } = useTheme();
  if (!files.length) return null;
  return (
    <View style={styles.chips}>
      {files.map((f) => (
        <Pressable
          key={f.id}
          accessibilityRole="button"
          accessibilityLabel={f.original_filename}
          onPress={() => openChronoFile(f)}
          style={[styles.fileChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Icon name={opensInViewer(f.original_filename) ? 'doc' : 'arrowDown'} size={14} color={colors.brand} />
          <Text variant="caption" tone="brand" numberOfLines={1} style={styles.shrink}>
            {f.original_filename}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function FileList({ files, onAdd, busy }: { files: ChronoFile[]; onAdd?: () => void; busy?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.gap8}>
      {files.length === 0 ? (
        <Text variant="caption" tone="subtle">
          {t('chrono.noFiles')}
        </Text>
      ) : (
        files.map((f) => (
          <Pressable
            key={f.id}
            accessibilityRole="button"
            onPress={() => openChronoFile(f)}
            style={[styles.fileRow, { borderColor: colors.border }]}
          >
            <Icon name={opensInViewer(f.original_filename) ? 'doc' : 'folder'} size={20} color={colors.brand} />
            <View style={styles.shrink}>
              <Text variant="label" numberOfLines={1}>
                {f.original_filename}
              </Text>
              <Text variant="caption" tone="subtle" numberOfLines={1}>
                {[fileSize(f.size), f.step_title ? `«${f.step_title}»` : null, f.uploaded_by?.legal_name].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text variant="caption" tone="brand">
              {opensInViewer(f.original_filename) ? t('chrono.fileOpen') : t('chrono.fileDownload')}
            </Text>
          </Pressable>
        ))
      )}
      {onAdd && <Button label={t('chrono.addFiles')} icon="plus" variant="soft" size="sm" loading={busy} onPress={onAdd} />}
    </View>
  );
}

/* ─────────────────────────── composer ─────────────────────────── */

/**
 * Note + files. With `people`, typing «@» lists the task's people; a pick
 * writes «@Full Name», and the ids of names still in the text when it is
 * sent are notified by the server.
 */
export function Composer({
  placeholder,
  submitLabel,
  busy,
  allowEmpty,
  requireFile,
  people,
  onSubmit,
}: {
  placeholder: string;
  submitLabel: string;
  busy: boolean;
  allowEmpty?: boolean;
  /** The job may only be handed in with a file attached. */
  requireFile?: boolean;
  people?: ChronoPerson[];
  onSubmit: (text: string, files: UploadFile[], mentionIds: number[]) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [caret, setCaret] = useState(0);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [picked, setPicked] = useState<ChronoPerson[]>([]);
  const [err, setErr] = useState('');
  // Set right after a mention is inserted: a controlled `value` change puts
  // the caret back at the start (web) — this moves it behind the name.
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const input = useRef<TextInput>(null);
  const query = people?.length ? mentionQuery(text, caret) : null;
  const matches = useMemo(() => {
    if (query == null || !people) return [];
    const q = query.toLocaleLowerCase();
    return people.filter((p) => (p.legal_name ?? '').toLocaleLowerCase().includes(q)).slice(0, 6);
  }, [query, people]);

  const choose = (p: ChronoPerson) => {
    const r = insertMention(text, caret, p.legal_name ?? '');
    setText(r.text);
    setCaret(r.caret);
    setSelection({ start: r.caret, end: r.caret });
    input.current?.focus();
    setPicked((xs) => (xs.some((x) => x.id === p.id) ? xs : [...xs, p]));
  };
  const send = async () => {
    if (requireFile && !files.length) return setErr(t('chrono.errFileRequired'));
    if (!text.trim() && !files.length && !allowEmpty) return setErr(t('chrono.errEmptyComment'));
    try {
      await onSubmit(text.trim(), files, mentionIds(text, picked));
      setText('');
      setFiles([]);
      setPicked([]);
      setErr('');
    } catch {
      /* the caller shows the error */
    }
  };
  const notified = picked.filter((p) => text.includes(`@${p.legal_name}`));

  return (
    <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <TextInput
        testID="chrono-composer"
        ref={input}
        value={text}
        selection={selection}
        onChangeText={(v) => {
          setText(v);
          setErr('');
          setSelection(undefined);
        }}
        onSelectionChange={(e) => setCaret(e.nativeEvent.selection.end)}
        placeholder={people?.length ? `${placeholder} ${t('chrono.mentionHint')}` : placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        style={[styles.input, { color: colors.fg, ...ff('500', 'text') }]}
      />
      {matches.length > 0 && (
        <View style={[styles.mentions, { borderColor: colors.border }]}>
          {matches.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" onPress={() => choose(p)} style={styles.mentionRow}>
              <Avatar name={p.legal_name ?? '?'} uri={p.photo_path} thumb={p.photo_thumb_path} size={26} />
              <View style={styles.shrink}>
                <Text variant="label" numberOfLines={1}>
                  {p.legal_name}
                </Text>
                {!!(p.position_name || p.branch_name) && (
                  <Text variant="caption" tone="subtle" numberOfLines={1}>
                    {[p.position_name, p.branch_name].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}
      {notified.length > 0 && (
        <Text variant="caption" tone="brand">
          {t('chrono.willNotify')} {notified.map((p) => p.legal_name).join(', ')}
        </Text>
      )}
      {files.length > 0 && (
        <View style={styles.chips}>
          {files.map((f, i) => (
            <Pressable
              key={`${f.name}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`${t('common.delete')} ${f.name}`}
              onPress={() => setFiles((xs) => xs.filter((_, j) => j !== i))}
              style={[styles.fileChip, { borderColor: colors.border }]}
            >
              <Text variant="caption" numberOfLines={1} style={styles.shrink}>
                {f.name}
              </Text>
              <Icon name="close" size={12} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}
      {!!err && (
        <Text variant="caption" tone="danger">
          {err}
        </Text>
      )}
      <View style={styles.composerBar}>
        <IconButton
          icon="folder"
          accessibilityLabel={t('chrono.attach')}
          onPress={() => void pickFiles().then((more) => setFiles((xs) => [...xs, ...more].slice(0, 10)))}
        />
        <View style={styles.flex} />
        <Button label={submitLabel} size="sm" loading={busy} onPress={() => void send()} />
      </View>
    </View>
  );
}

/* ─────────────────────────── small forms ─────────────────────────── */

export function NoteForm({
  label,
  required,
  danger,
  submitLabel,
  busy,
  onSubmit,
}: {
  label: string;
  required?: boolean;
  danger?: boolean;
  submitLabel: string;
  busy: boolean;
  onSubmit: (note: string) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  return (
    <View style={styles.gap8}>
      <FormInput label={label} value={note} onChangeText={(v) => (setNote(v), setErr(''))} multiline required={required} error={err || undefined} />
      <Button
        label={submitLabel}
        variant={danger ? 'danger' : 'primary'}
        loading={busy}
        full
        onPress={() => {
          if (required && note.trim().length < 3) return setErr(t('chrono.errRejectReason'));
          void onSubmit(note.trim()).catch(() => undefined);
        }}
      />
    </View>
  );
}

export function DateReasonForm({
  dateLabel,
  reasonLabel,
  min,
  initial,
  mustChange,
  reasonOptional,
  submitLabel,
  busy,
  onSubmit,
}: {
  dateLabel: string;
  reasonLabel: string;
  min?: string;
  initial?: string;
  /** The date has to differ from `initial` (moving a deadline). */
  mustChange?: boolean;
  /** Approving an extension: the note may stay empty. */
  reasonOptional?: boolean;
  submitLabel: string;
  busy: boolean;
  onSubmit: (date: string, reason: string) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [date, setDate] = useState(initial ?? '');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.gap8}>
      <SelectField label={dateLabel} value={date ? fmt(date) : ''} icon="calendar" onPress={() => setOpen(true)} />
      <FormInput
        label={reasonLabel}
        value={reason}
        onChangeText={(v) => (setReason(v), setErr(''))}
        multiline
        required={!reasonOptional}
        error={err || undefined}
      />
      <Button
        label={submitLabel}
        loading={busy}
        full
        onPress={() => {
          if (!date) return setErr(t('chrono.errDate'));
          if (min && date < min) return setErr(t('chrono.errDateTooEarly', { date: fmt(min) }));
          if (mustChange && initial && date === initial) return setErr(t('chrono.errSameDate'));
          if (!reasonOptional && reason.trim().length < 3) return setErr(t('chrono.errReason'));
          void onSubmit(date, reason.trim()).catch(() => undefined);
        }}
      />
      {open && (
        <DatePickerModal visible value={date || min} title={dateLabel} onConfirm={(d) => setDate(d)} onClose={() => setOpen(false)} />
      )}
    </View>
  );
}

/* ─────────────────────────── extensions ─────────────────────────── */

export function ExtensionHistory({ items }: { items: ChronoExtension[] }) {
  const { t } = useTranslation();
  const tone = { pending: 'warning', approved: 'success', rejected: 'danger' } as const;
  if (!items.length) return null;
  return (
    <View style={styles.gap8}>
      <Text variant="label">{t('chrono.extHistory', { count: items.length })}</Text>
      {[...items].reverse().map((e) => (
        <View key={e.id} style={styles.histRow}>
          <View style={styles.rowWrap}>
            <Badge label={t(`chrono.ext_${e.status}`)} tone={tone[e.status]} />
            <Text variant="caption">
              {fmt(e.old_deadline)} → {fmt(e.new_deadline ?? e.requested_deadline)}
            </Text>
          </View>
          <Text variant="body" numberOfLines={4}>
            {e.reason}
          </Text>
          {!!e.decision_note && (
            <Text variant="caption" tone="muted" numberOfLines={3}>
              ↳ {e.decision_note}
            </Text>
          )}
          <Text variant="caption" tone="subtle">
            {[e.requested_by?.legal_name ?? t('chrono.system'), fmtTime(e.created_at)].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ─────────────────────────── the chronology ─────────────────────────── */

function eventDetail(t: (k: string, o?: Record<string, unknown>) => string, e: ChronoEvent): string | null {
  const m = (e.meta ?? {}) as Record<string, unknown>;
  switch (e.kind) {
    case 'extension_requested':
      return `${fmt(m.old as string)} → ${fmt(m.requested as string)}`;
    case 'extension_approved':
    case 'deadline_changed':
    case 'task_deadline_changed':
      return `${fmt(m.old as string)} → ${fmt(m.new as string)}`;
    case 'reassigned':
    case 'main_executor_changed':
      return `${(m.from as string) ?? '—'} → ${(m.to as string) ?? '—'}`;
    case 'step_moved':
      return `${(m.from as string) ?? t('chrono.mainJob')} → ${(m.to as string) ?? t('chrono.mainJob')}`;
    default:
      return null;
  }
}

export function Timeline({ events, max = 30 }: { events: ChronoEvent[]; max?: number }) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const shown = all ? events : events.slice(0, max);
  if (!events.length)
    return (
      <Text variant="caption" tone="subtle">
        {t('chrono.timelineEmpty')}
      </Text>
    );
  return (
    <View style={styles.gap12}>
      {shown.map((e) => {
        const detail = eventDetail(t as never, e);
        return (
          <View key={e.id} style={styles.event}>
            <Text variant="label">{t(`chrono.ev_${e.kind}`, { defaultValue: e.kind })}</Text>
            {!!e.step_title && (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                «{e.step_title}»
              </Text>
            )}
            {!!detail && <Text variant="caption">{detail}</Text>}
            {!!e.text && (
              <Text variant="body" numberOfLines={6}>
                {withMentions(e.text, e.meta)}
              </Text>
            )}
            <FileChips files={e.attachments} />
            <Text variant="caption" tone="subtle">
              {[e.actor?.legal_name ?? t('chrono.system'), fmtTime(e.created_at)].filter(Boolean).join(' · ')}
            </Text>
          </View>
        );
      })}
      {events.length > max && (
        <Button label={all ? t('chrono.showLess') : t('chrono.showAll', { count: events.length })} variant="link" onPress={() => setAll((v) => !v)} />
      )}
    </View>
  );
}

/** The comment text with every «@Name» that was really mentioned in brand colour. */
function withMentions(text: string, meta?: Record<string, unknown> | null): React.ReactNode {
  const names = ((meta?.mentions as { name?: string }[] | undefined) ?? []).map((m) => m.name).filter((n): n is string => !!n);
  if (!names.length) return text;
  const esc = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length);
  return text.split(new RegExp(`(@(?:${esc.join('|')}))`, 'g')).map((part, i) =>
    part.startsWith('@') && names.includes(part.slice(1)) ? (
      <Text key={i} variant="body" tone="brand" weight="700">
        {part}
      </Text>
    ) : (
      part
    ),
  );
}

/** Run a write, toast the result. Re-throws so a form can stay open on error. */
export async function runWrite(p: Promise<unknown>, ok: string, fallback: string) {
  try {
    await p;
    toast.success(ok);
  } catch (e) {
    toast.error(getApiErrorMessage(e, fallback));
    throw e;
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1, flex: 1 },
  gap8: { gap: 8 },
  gap12: { gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 240,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 10 },
  composer: { borderWidth: 1, borderRadius: 16, padding: 10, gap: 8 },
  input: { minHeight: 72, textAlignVertical: 'top', fontSize: 15 },
  mentions: { borderWidth: 1, borderRadius: 12, paddingVertical: 4 },
  mentionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 6 },
  composerBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  histRow: { gap: 4, paddingVertical: 6 },
  event: { gap: 3 },
});
