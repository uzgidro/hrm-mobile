import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';
import { FILE_EDITOR_CONFIG, ONLYOFFICE_SERVER_URL } from '@/api/urls';
import { toApiError } from '@/api/errors';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { ErrorState } from '@/components/StateViews';
import { documentKeys } from '../api/queries';

// View-only OnlyOffice document viewer, mirroring OrderDocumentScreen. The file
// editor-config route decides view/edit server-side (no `mode` param); a plain
// viewer always gets mode:'view'. Bytes are fetched server-to-server by
// OnlyOffice from the URLs inside the JWT-signed config — the WebView only loads
// the editor UI and hands it the config.
export default function DocumentViewerScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const fileId = Number(id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const { data: config, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...documentKeys.all, 'editor-config', fileId],
    queryFn: () => apiClient.get(FILE_EDITOR_CONFIG(fileId)).then((r) => r.data),
    enabled: !!fileId,
    staleTime: 0,
    gcTime: 0,
    retry: false, // a 422 (unsupported type) is not worth retrying
  });

  // 422 = the backend can't open this extension in OnlyOffice. Surface a clear
  // message rather than the generic load error (the list already hides these,
  // so this only fires on a stale/edge case).
  const unsupported = toApiError(error).status === 422;

  const html = useMemo(() => {
    if (!config) return '';
    const editorConfig = { ...config, type: 'mobile', width: '100%', height: '100%' };
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script type="text/javascript" src="${ONLYOFFICE_SERVER_URL}/web-apps/apps/api/documents/api.js"></script>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background:#fff; }
    #editor { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script type="text/javascript">
    try {
      new DocsAPI.DocEditor("editor", ${JSON.stringify(editorConfig)});
    } catch (e) {
      document.body.innerHTML = '<div style="padding:24px;font-family:sans-serif;color:#333">${t('documents.openError')}: ' + e.message + '</div>';
    }
  </script>
</body>
</html>`;
  }, [config, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{name || t('documents.viewerTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primaryLight} size="large" />
          <Text style={styles.hint}>{t('documents.loading')}</Text>
        </View>
      ) : isError || !config ? (
        <ErrorState
          title={unsupported ? t('documents.unsupportedTitle') : t('documents.openError')}
          message={unsupported ? t('documents.unsupportedMessage') : undefined}
          onRetry={unsupported ? undefined : () => refetch()}
        />
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html, baseUrl: ONLYOFFICE_SERVER_URL }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          allowsInlineMediaPlayback
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primaryLight} size="large" />
            </View>
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
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: c.bg },
    hint: { fontSize: 14, color: c.textMuted },

    webview: { flex: 1, backgroundColor: '#fff' },
  });
