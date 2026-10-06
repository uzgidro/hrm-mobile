import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import { onlyOfficeDeviceParams } from '@/utils/onlyOffice';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';
import {
  LETTER_EDITOR_CONFIG, LETTER_REPORT_EDITOR_CONFIG, LETTER_GUVOHNOMA_EDITOR_CONFIG,
  LETTER_ATTACHMENT_EDITOR_CONFIG,
} from '@/api/urls';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ErrorState } from '@/components/StateViews';
import { OnlyOfficeFrame } from '@/components/OnlyOfficeFrame';

// Xatning QAYSI hujjati ochilyapti. `main` — bildirgi/ariza/safar hujjati;
// `guvohnoma` — safar varaqasi; `report` — hisobot docx'i; `attachment` —
// muallif biriktirgan ilova. Konfig yo'li shu bo'yicha tanlanadi (ruxsat va
// view/edit rejimini SERVER hal qiladi).
type DocKind = 'main' | 'report' | 'guvohnoma' | 'attachment';

const CONFIG_URL: Record<DocKind, (id: number) => string> = {
  main: LETTER_EDITOR_CONFIG,
  report: LETTER_REPORT_EDITOR_CONFIG,
  guvohnoma: LETTER_GUVOHNOMA_EDITOR_CONFIG,
  attachment: LETTER_ATTACHMENT_EDITOR_CONFIG,
};

const TITLE_KEY: Record<DocKind, string> = {
  main: 'letters.documentTitle',
  report: 'letters.reportDocumentTitle',
  guvohnoma: 'letters.guvohnomaDocumentTitle',
  attachment: 'letters.attachmentDocumentTitle',
};

export default function LetterDocumentScreen() {
  const { t } = useTranslation();
  const { id, mode = 'view', kind: kindParam } =
    useLocalSearchParams<{ id: string; mode?: string; kind?: string }>();
  const kind: DocKind = (kindParam && kindParam in CONFIG_URL ? kindParam : 'main') as DocKind;
  const letterId = Number(id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { width } = useWindowDimensions();
  const deviceParams = onlyOfficeDeviceParams(Platform.OS, width);
  const { data: config, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['letter-editor-config', letterId, kind, mode, deviceParams.device ?? null],
    // Guvohnoma/ilova konfiglari `mode` ni umuman qabul qilmaydi (server doim
    // ko'rish beradi) — ortiqcha parametr yubormaymiz.
    queryFn: () => apiClient
      .get(CONFIG_URL[kind](letterId), {
        params: kind === 'main' || kind === 'report' ? { mode, ...deviceParams } : deviceParams,
      })
      .then((r) => r.data),
    enabled: !!letterId,
    staleTime: 0,
    gcTime: 0,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title={t(TITLE_KEY[kind])} />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primaryLight} size="large" />
          <Text style={styles.hint}>{t('letters.documentLoading')}</Text>
        </View>
      ) : isError || !config ? (
        <ErrorState title={t('letters.documentLoadError')} onRetry={() => refetch()} />
      ) : (
        <OnlyOfficeFrame config={config} errorLabel={t('letters.documentOpenError')} title={t(TITLE_KEY[kind])} />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: c.bg },
    hint: { fontSize: 14, color: c.textMuted, ...ff('700') },
  });
