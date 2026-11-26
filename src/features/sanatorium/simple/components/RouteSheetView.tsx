// The guest's route sheet («Yo'l varaqasi»): steps in the guest's order with a tick for what is done and the
// current one marked, the family's own rooms / visits, a language switch, PDF download and share.
import React, { useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { toast } from '@/lib/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Segmented, Text } from '@/ui';
import { DownloadButton } from '../../components/sections2/kit';
import { useSanFeatures } from '../../utils/features';
import { guestCabinetUrl } from '../../utils/guests';
import { fmtDate, sanErrorMessage } from '../../utils/sanatorium';
import { routeSheetFileUrl } from '../api';
import { SHEET_LANGS, sheetLang, type SheetLang } from '../sheetText';
import type { NewCredential, RouteSheet, RouteStep } from '../types';
import { familyLines, isMissingEndpoint, routeSheetText, stepLine, stepSaysMore, stepText, stepTitle, textLang } from '../utils';
import { useWhen } from './parts';

function Tick({ done, now }: { done: boolean; now?: boolean }) {
  const { colors: c } = useTheme();
  return <Icon name={done ? 'check' : 'clock'} size={18} color={done ? c.success : now ? c.brand : c.fgSubtle} />;
}

/** One line per step: «✓ Xona». */
export function RouteStepper({ steps }: { steps: RouteStep[] }) {
  const { i18n } = useTranslation();
  const lang = textLang(i18n.language);
  return (
    <View style={styles.stepper} testID="route-stepper">
      {steps.map((s) => (
        <View key={s.key} style={styles.chip} testID={`route-step-${s.key}`}>
          <Tick done={s.done} />
          <Text variant="caption" weight={s.done ? '500' : '700'}>{stepTitle(s, lang)}</Text>
        </View>
      ))}
    </View>
  );
}

export function RouteSheetBody({ sheet, others = [], lang: forced }: { sheet: RouteSheet; others?: RouteSheet[]; lang?: SheetLang }) {
  const { i18n, t } = useTranslation();
  const lang = forced ?? textLang(i18n.language);
  const when = useWhen();
  const firstOpen = sheet.steps.findIndex((s) => !s.done);
  return (
    <View style={styles.body} testID="route-sheet">
      {!!sheet.period && (
        <Text variant="label" tone="muted" testID="route-period">
          {[`${fmtDate(sheet.period.from)} — ${fmtDate(sheet.period.to)}`, t('sanFlow.common.nightsN', { n: sheet.period.nights }), sheet.period.checkout_time ? t('sanFlow.route.outBy', { time: sheet.period.checkout_time }) : null].filter(Boolean).join(' · ')}
        </Text>
      )}
      {(sheet.members ?? []).length > 0 && <Text variant="caption" tone="muted">{t('sanFlow.sheet.with', { names: sheet.members!.map((m) => m.full_name).join(', ') })}</Text>}
      {sheet.steps.map((s, i) => {
        const line = stepLine(s, lang, when);
        return (
          <View key={s.key} style={styles.row} testID={`route-row-${s.key}`}>
            <Text variant="heading" tone={i === firstOpen ? 'brand' : 'muted'} style={styles.num}>{i + 1}</Text>
            <View style={styles.flex}>
              <View style={styles.titleRow}>
                <Text variant="body" weight="700" style={styles.flex}>{stepTitle(s, lang)}</Text>
                <Tick done={s.done} now={i === firstOpen} />
              </View>
              {!!line && <Text variant="label">{line}</Text>}
              {stepSaysMore(s) && !!stepText(s, lang) && <Text variant="caption" tone="muted">{stepText(s, lang)}</Text>}
              {familyLines(sheet, others, s.key, lang, when).map((l) => <Text key={l} variant="caption">{l}</Text>)}
            </View>
          </View>
        );
      })}
      {!!sheet.contacts && <Text variant="caption" tone="muted">{t('sanSimple.route.contacts')}: {sheet.contacts}</Text>}
    </View>
  );
}

/** The guest's own language until the registrar picks another. */
export function useSheetLang(sheet?: RouteSheet | null) {
  const [chosen, setChosen] = useState<SheetLang | null>(null);
  return [chosen ?? sheetLang(sheet?.lang), setChosen] as const;
}

export function SheetLangSwitch({ value, onChange }: { value: SheetLang; onChange: (l: SheetLang) => void }) {
  return <Segmented value={value} onChange={onChange} options={SHEET_LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))} testID="sheet-lang" />;
}

/** OS share sheet; a browser without one gets the text in the clipboard. */
export async function shareText(message: string, copied: string): Promise<void> {
  const nav = (globalThis as { navigator?: { share?: unknown; clipboard?: { writeText: (s: string) => Promise<void> } } }).navigator;
  if (Platform.OS === 'web' && !nav?.share) {
    await nav?.clipboard?.writeText(message).then(() => toast.success(copied)).catch(() => {});
    return;
  }
  await Share.share({ message }).catch(() => {});
}

/** Language of the paper, PDF from the server (text share where the server has no PDF yet) and share. */
export function RouteSheetTools({ stayId, sheet, others, creds, lang, onLang }: {
  stayId: number; sheet: RouteSheet; others?: RouteSheet[]; creds?: NewCredential[]; lang: SheetLang; onLang: (l: SheetLang) => void;
}) {
  const { t } = useTranslation();
  const features = useSanFeatures();
  const share = () => shareText(routeSheetText(sheet, lang, { others, creds, cabinetUrl: features.on('guest_cabinet') ? guestCabinetUrl() : null }), t('sanGuests.copied'));
  return (
    <View style={styles.tools}>
      <Text variant="label" tone="muted">{t('sanFlow.route.lang')}</Text>
      <SheetLangSwitch value={lang} onChange={onLang} />
      <View style={styles.stepper}>
        <DownloadButton
          testID="route-pdf" label={t('sanFlow.sheet.pdf')} url={routeSheetFileUrl(stayId)} params={{ format: 'pdf', lang }} filename={`route-sheet-${stayId}-${lang}.pdf`} format="pdf"
          onError={(e) => {
            if (isMissingEndpoint(e)) {
              toast.info(t('sanFlow.sheet.noPdf'));
              void share();
            } else toast.error(sanErrorMessage(e, t('sanatorium.s2.downloadFail')));
          }}
        />
        <Button testID="route-share" label={t('sanFlow.sheet.share')} icon="arrowUp" size="sm" variant="soft" onPress={() => void share()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stepper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  body: { gap: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  num: { width: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tools: { gap: 8 },
});
