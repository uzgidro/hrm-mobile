import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/api/client';
import { LETTER_EDITOR_CONFIG, ONLYOFFICE_SERVER_URL } from '@/api/urls';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { Icon } from '@/components/Icon';
import { ErrorState } from '@/components/StateViews';

export default function LetterDocumentScreen() {
  const { id, mode = 'view' } = useLocalSearchParams<{ id: string; mode?: string }>();
  const letterId = Number(id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { data: config, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['letter-editor-config', letterId, mode],
    queryFn: () => apiClient.get(LETTER_EDITOR_CONFIG(letterId), { params: { mode } }).then((r) => r.data),
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
    catch (e) { document.body.innerHTML = '<div style="padding:24px;font-family:sans-serif;color:#333">Hujjatni ochishda xatolik: ' + e.message + '</div>'; }
  </script>
</body>
</html>`;
  }, [config]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Icon name="chevronLeft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hujjat</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primaryLight} size="large" />
          <Text style={styles.hint}>Hujjat yuklanmoqda...</Text>
        </View>
      ) : isError || !config ? (
        <ErrorState title="Hujjatni yuklab bo'lmadi" onRetry={() => refetch()} />
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.cardBorder },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: c.bg },
    hint: { fontSize: 14, color: c.textMuted },
    webview: { flex: 1, backgroundColor: '#fff' },
  });
