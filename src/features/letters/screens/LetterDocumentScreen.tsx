import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';
import {
  LETTER_EDITOR_CONFIG, LETTER_REPORT_EDITOR_CONFIG, LETTER_GUVOHNOMA_EDITOR_CONFIG,
  LETTER_ATTACHMENT_EDITOR_CONFIG, ONLYOFFICE_SERVER_URL,
} from '@/api/urls';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ErrorState } from '@/components/StateViews';

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

  const { data: config, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['letter-editor-config', letterId, kind, mode],
    // Guvohnoma/ilova konfiglari `mode` ni umuman qabul qilmaydi (server doim
    // ko'rish beradi) — ortiqcha parametr yubormaymiz.
    queryFn: () => apiClient
      .get(CONFIG_URL[kind](letterId), {
        params: kind === 'main' || kind === 'report' ? { mode } : undefined,
      })
      .then((r) => r.data),
    enabled: !!letterId,
    staleTime: 0,
    gcTime: 0,
  });

  const html = useMemo(() => {
    if (!config) return '';
    const editorConfig = { ...config, type: 'mobile', width: '100%', height: '100%' };
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script type="text/javascript" src="${ONLYOFFICE_SERVER_URL}/web-apps/apps/api/documents/api.js"></script>
  <style>html,body{margin:0;padding:0;height:100%;width:100%;overflow:hidden;background:#fff}#editor{height:100%;width:100%}</style>
</head>
<body>
  <div id="editor"></div>
  <script type="text/javascript">
    try { new DocsAPI.DocEditor("editor", ${JSON.stringify(editorConfig)}); }
    catch (e) { document.body.innerHTML = '<div style="padding:24px;font-family:sans-serif;color:#333">${t('letters.documentOpenError')}: ' + e.message + '</div>'; }
  </script>
</body>
</html>`;
  }, [config, t]);

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
        <WebView
          originWhitelist={['*']}
          source={{ html, baseUrl: ONLYOFFICE_SERVER_URL }}
          javaScriptEnabled domStorageEnabled startInLoadingState allowsInlineMediaPlayback
          renderLoading={() => (
            <View style={styles.center}><ActivityIndicator color={colors.primaryLight} size="large" /></View>
          )}
          style={styles.webview}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: c.bg },
    hint: { fontSize: 14, color: c.textMuted },
    webview: { flex: 1, backgroundColor: '#fff' },
  });
