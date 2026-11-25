// Building blocks shared by the "sections" screens: access + feature gate, trilingual text fields,
// chip pickers, photo field, row actions, document download button and simple bar charts.
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { confirm } from '@/lib/confirm';
import { downloadAndSave } from '@/lib/saveFile';
import { ensureMediaLibraryAccess } from '@/lib/mediaLibraryAccess';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Button, Chip, Fab, IconButton, PageHeader, Screen, Text } from '@/ui';
import { useSanFeatures, type SanFeatureKey } from '../../utils/features';
import type { SanRole } from '../../types';
import type { DeleteResult, PickedFile } from '../../api/sections2';
import { PHOTO_UPLOAD_QUALITY, downscaleAction } from '../../utils/roomPhotos';
import { DOC_MIME, barPercents } from '../../utils/sections2';
import { sanErrorMessage } from '../../utils/sanatorium';
import { Denied, useSanAccess, useSanReadOnly } from '../common';

/** Role + section switch gate. `loaded` false = switches unknown yet (counts as on). */
export function useSectionGate(feature: SanFeatureKey | null, ...roles: SanRole[]): boolean {
  const access = useSanAccess(...roles);
  const f = useSanFeatures();
  return access && (feature ? f.on(feature) : true);
}

/** App language reduced to the three content languages of the catalog. */
export function useContentLang(): string {
  const { i18n } = useTranslation();
  return i18n.language;
}

export function useWeekdayNames(): string[] {
  const { t } = useTranslation();
  return [0, 1, 2, 3, 4, 5, 6].map((d) => t(`sanatorium.s2.wd.${d}`));
}

/** Uzbek / Russian / English input trio for catalog texts; Uzbek is the required one. */
export function TextTrio({
  label, values, onChange, multiline, testID,
}: {
  label: string;
  values: [string, string, string];
  onChange: (i: 0 | 1 | 2, v: string) => void;
  multiline?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const langs = ['uz', 'ru', 'en'] as const;
  return (
    <View>
      {langs.map((l, i) => (
        <FormInput
          key={l}
          label={`${label} (${t(`sanatorium.s2.lang.${l}`)})`}
          value={values[i]}
          onChangeText={(v) => onChange(i as 0 | 1 | 2, v)}
          multiline={multiline}
          required={i === 0 && !multiline}
          testID={testID ? `${testID}-${l}` : undefined}
        />
      ))}
    </View>
  );
}

/** Wrapping row of chips; `selected` decides which are on. */
export function ChipWrap<T extends string | number>({
  options, isOn, onToggle, testID,
}: {
  options: { value: T; label: string }[];
  isOn: (v: T) => boolean;
  onToggle: (v: T) => void;
  testID?: string;
}) {
  return (
    <View style={styles.wrap} testID={testID}>
      {options.map((o) => (
        <Chip key={String(o.value)} label={o.label} selected={isOn(o.value)} onPress={() => onToggle(o.value)} testID={testID ? `${testID}-${o.value}` : undefined} />
      ))}
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <Text variant="label" tone="muted" style={styles.fieldLabel}>{children}</Text>;
}

/** Edit / delete (and optional up / down) icons of a list row. */
export function RowTools({
  onEdit, onDelete, onUp, onDown, testID,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  onUp?: (() => void) | null;
  onDown?: (() => void) | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  // Row tools are all writes (edit / delete / reorder): not drawn for the view-only chairman.
  if (useSanReadOnly()) return null;
  return (
    <View style={styles.tools} testID={testID}>
      {onUp !== undefined && <IconButton icon="arrowUp" tone="soft" accessibilityLabel={t('sanatorium.s2.moveUp')} onPress={onUp ?? (() => {})} testID={testID ? `${testID}-up` : undefined} />}
      {onDown !== undefined && <IconButton icon="arrowDown" tone="soft" accessibilityLabel={t('sanatorium.s2.moveDown')} onPress={onDown ?? (() => {})} testID={testID ? `${testID}-down` : undefined} />}
      {onEdit && <IconButton icon="edit" tone="soft" accessibilityLabel={t('sanatorium.edit')} onPress={onEdit} testID={testID ? `${testID}-edit` : undefined} />}
      {onDelete && <IconButton icon="trash" tone="soft" accessibilityLabel={t('sanatorium.remove')} onPress={onDelete} testID={testID ? `${testID}-del` : undefined} />}
    </View>
  );
}

/** Confirms, runs a delete and tells whether the row was removed or only deactivated. */
export function useConfirmDelete() {
  const { t } = useTranslation();
  return async (title: string, run: () => Promise<DeleteResult | undefined>): Promise<boolean> => {
    const ok = await confirm({ title, confirmLabel: t('sanatorium.remove'), cancelLabel: t('common.cancel'), destructive: true });
    if (!ok) return false;
    try {
      const r = await run();
      toast.success(r?.deactivated ? t('sanatorium.s2.deactivated') : t('sanatorium.s2.deleted'));
      return true;
    } catch (e) {
      toast.error(sanErrorMessage(e, t('errors.generic')));
      return false;
    }
  };
}

// ── Photo field ──
export type PhotoValue = { existing: { thumb_url: string } | null; pending: PickedFile | null; remove: boolean };
export const emptyPhoto = (existing: { thumb_url: string } | null = null): PhotoValue => ({ existing, pending: null, remove: false });

/** Picks one image (downscaled), shows the current / pending one. The owner uploads it after the save. */
export function PhotoField({ value, onChange, testID }: { value: PhotoValue; onChange: (v: PhotoValue) => void; testID?: string }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const shown = value.pending ? value.pending.uri : value.remove ? null : value.existing?.thumb_url ?? null;
  const pick = async () => {
    if (!(await ensureMediaLibraryAccess())) return toast.error(t('sanatorium.photoPermission'));
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    try {
      const out = await ImageManipulator.manipulateAsync(a.uri, downscaleAction(a.width, a.height), { compress: PHOTO_UPLOAD_QUALITY, format: ImageManipulator.SaveFormat.JPEG });
      onChange({ ...value, pending: { uri: out.uri, name: `${(a.fileName ?? 'photo').replace(/\.[^.]+$/, '') || 'photo'}.jpg`, mimeType: 'image/jpeg' }, remove: false });
    } catch (e) {
      toast.error(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View style={styles.photo} testID={testID}>
      <FieldLabel>{t('sanatorium.photos')}</FieldLabel>
      {shown ? (
        <Image source={{ uri: shown }} style={[styles.photoImg, { backgroundColor: c.surface2 }]} contentFit="cover" />
      ) : (
        <Text variant="caption" tone="subtle">{t('sanatorium.noPhotos')}</Text>
      )}
      {Platform.OS === 'web' && <Text variant="caption" tone="subtle">{t('sanatorium.photoWebHint')}</Text>}
      <View style={styles.wrap}>
        <Button label={t('sanatorium.addPhotos')} icon="camera" size="sm" variant="soft" onPress={() => void pick()} testID={testID ? `${testID}-pick` : undefined} />
        {!!shown && <Button label={t('sanatorium.deletePhoto')} size="sm" variant="dangerGhost" onPress={() => onChange({ ...value, pending: null, remove: !!value.existing })} testID={testID ? `${testID}-remove` : undefined} />}
      </View>
    </View>
  );
}

// ── Files ──
/** Authenticated download of a document; the user picks where to save it (existing app approach). */
export function DownloadButton({
  label, url, params, filename, format = 'pdf', size = 'sm', variant = 'soft', testID, onError, disabled,
}: {
  label: string;
  url: string;
  params?: Record<string, unknown>;
  filename: string;
  format?: 'pdf' | 'docx' | 'xlsx';
  size?: 'sm' | 'md';
  variant?: 'soft' | 'primary';
  testID?: string;
  /** Called with the error instead of the default toast; the caller may fall back (e.g. to another file). */
  onError?: (e: unknown) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const mime = format === 'xlsx' ? undefined : DOC_MIME[format];
      const r = await downloadAndSave({ url, params }, filename, mime);
      if (r === 'saved') toast.success(t('sanatorium.s2.fileSaved'));
    } catch (e) {
      if (onError) onError(e);
      else toast.error(sanErrorMessage(e, t('sanatorium.s2.downloadFail')));
    } finally {
      setBusy(false);
    }
  };
  return <Button label={label} icon="doc" size={size} variant={variant} loading={busy} disabled={disabled} onPress={() => void run()} testID={testID} />;
}

// ── Charts ──
/**
 * Vertical bars drawn with Views (no chart library in the app). Optional: `reference` draws a dashed
 * line at that value (e.g. total beds), `allLabels` labels every bar, `showValues` prints the value above it.
 */
export function BarChart({
  values, labels, height = 96, max, testID, reference, allLabels, showValues,
}: { values: number[]; labels?: string[]; height?: number; max?: number; testID?: string; reference?: number; allLabels?: boolean; showValues?: boolean }) {
  const { colors: c } = useTheme();
  const top = reference && reference > 0 ? Math.max(max ?? 0, reference, ...values) : max;
  const pct = barPercents(values, top);
  const refPct = reference && reference > 0 && top ? Math.min(100, (reference / top) * 100) : null;
  return (
    <View testID={testID}>
      {showValues && (
        <View style={styles.barLabels}>
          {values.map((v, i) => (
            <Text key={i} variant="caption" tone="muted" style={styles.barCell}>{v}</Text>
          ))}
        </View>
      )}
      <View style={[styles.bars, { height }]}>
        {pct.map((p, i) => (
          <View key={i} style={styles.barCol} accessibilityLabel={`${labels?.[i] ?? i + 1}: ${values[i]}`}>
            <View style={[styles.bar, { height: `${p}%`, backgroundColor: c.brand }]} />
          </View>
        ))}
        {refPct != null && <View pointerEvents="none" testID={testID ? `${testID}-ref` : undefined} style={[styles.refLine, { bottom: `${refPct}%`, borderColor: c.danger }]} />}
      </View>
      {labels && labels.length > 0 && (
        allLabels ? (
          <View style={styles.barLabels}>
            {labels.map((l, i) => (
              <Text key={i} variant="caption" tone="subtle" style={styles.barCell} numberOfLines={1}>{l}</Text>
            ))}
          </View>
        ) : (
          <View style={styles.barLabels}>
            <Text variant="caption" tone="subtle">{labels[0]}</Text>
            <Text variant="caption" tone="subtle">{labels[labels.length - 1]}</Text>
          </View>
        )
      )}
    </View>
  );
}

/** Horizontal labelled bar: `value` out of `max`. */
export function HBar({ label, value, max, right, tone, testID }: { label: string; value: number; max: number; right?: string; tone?: 'brand' | 'warn'; testID?: string }) {
  const { colors: c } = useTheme();
  const p = barPercents([value], max)[0] ?? 0;
  return (
    <View style={styles.hbar} testID={testID}>
      <View style={styles.hbarHead}>
        <Text variant="label" style={styles.flex} numberOfLines={1}>{label}</Text>
        <Text variant="label" tone="muted">{right ?? String(value)}</Text>
      </View>
      <View style={[styles.hbarTrack, { backgroundColor: c.surface2 }]}>
        <View style={[styles.hbarFill, { width: `${p}%`, backgroundColor: tone === 'warn' ? c.warning : c.brand }]} />
      </View>
    </View>
  );
}

/** Five stars, filled up to the (rounded) rating. */
export function Stars({ value }: { value: number | null | undefined }) {
  const { colors: c } = useTheme();
  const n = Math.max(0, Math.min(5, Math.round(value ?? 0)));
  return (
    <Text variant="body" style={{ color: c.warning }} accessibilityLabel={`${value ?? 0}/5`}>
      {'\u2605'.repeat(n) + '\u2606'.repeat(5 - n)}
    </Text>
  );
}

/** Pressable text row used for light-weight selectable lines inside sheets. */
export function PressRow({ children, onPress, testID }: { children: React.ReactNode; onPress: () => void; testID?: string }) {
  return <Pressable onPress={onPress} testID={testID} accessibilityRole="button" style={styles.pressRow}>{children}</Pressable>;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  flex: { flex: 1 },
  fieldLabel: { marginTop: 6, marginBottom: 4 },
  tools: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  photo: { gap: 6, marginBottom: 8 },
  photoImg: { width: '100%', aspectRatio: 16 / 9, borderRadius: radii.md },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  barCell: { flex: 1, textAlign: 'center' },
  refLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  hbar: { marginVertical: 4, gap: 3 },
  hbarHead: { flexDirection: 'row', gap: 8 },
  hbarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  hbarFill: { height: '100%', borderRadius: 4 },
  pressRow: { paddingVertical: 8 },
  body: { marginTop: 12, gap: 10 },
});

/** Screen shell: role + feature gate, header, pull to refresh and an optional «add» button. */
export function SectionScreen({
  title, subtitle, feature, roles, testID, refreshing, onRefresh, onAdd, addLabel, children,
}: {
  title: string;
  subtitle?: string;
  feature: SanFeatureKey | null;
  roles: SanRole[];
  testID: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  const allowed = useSectionGate(feature, ...roles);
  const readOnly = useSanReadOnly();
  if (!allowed) return <Denied />;
  return (
    <>
      <Screen refreshing={refreshing} onRefresh={onRefresh} testID={testID}>
        <PageHeader title={title} subtitle={subtitle} />
        <View style={styles.body}>{children}</View>
      </Screen>
      {onAdd && !readOnly && <Fab onPress={onAdd} accessibilityLabel={addLabel ?? title} testID={`${testID}-add`} />}
    </>
  );
}
