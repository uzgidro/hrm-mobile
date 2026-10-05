// OnlyOffice muharriri/ko'ruvchisi — buyruq, xat va hujjat ekranlari uchun umumiy.
//
// Nativeda react-native-webview (avvalgidek). Vebda WebView ishlamaydi («React
// Native WebView does not support this platform») — u yerda xuddi shu HTML
// `<iframe srcDoc>` ichida ochiladi: api.js muharrirni o'z iframe'ida quradi va
// konfig oqimi (server JWT bilan imzolagan konfig → DocsAPI.DocEditor) o'zgarmaydi.
import { createElement, useMemo } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { ONLYOFFICE_SERVER_URL } from '@/api/urls';
import { useTheme } from '@/theme/ThemeProvider';
import { buildOnlyOfficeHtml, onlyOfficeEditorType, onlyOfficeFrameKind } from '@/utils/onlyOffice';

export function OnlyOfficeFrame({
  config,
  errorLabel,
  title,
}: {
  config: Record<string, unknown>;
  /** Muharrir yuklanmasa sahifa ichida ko'rsatiladigan matn (tarjima qilingan). */
  errorLabel: string;
  /** Vebdagi iframe'ning ekran o'quvchi nomi. */
  title?: string;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const editorType = onlyOfficeEditorType(Platform.OS, width);
  const html = useMemo(
    () => buildOnlyOfficeHtml({ config, serverUrl: ONLYOFFICE_SERVER_URL, errorLabel, editorType }),
    [config, errorLabel, editorType],
  );

  if (onlyOfficeFrameKind(Platform.OS) === 'iframe') {
    return (
      <View style={styles.fill} testID="onlyoffice-iframe-host">
        {createElement('iframe', {
          srcDoc: html,
          title: title ?? 'OnlyOffice',
          allow: 'clipboard-read; clipboard-write; fullscreen',
          allowFullScreen: true,
          style: { border: 'none', width: '100%', height: '100%', flex: 1, background: 'white' },
        })}
      </View>
    );
  }

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html, baseUrl: ONLYOFFICE_SERVER_URL }}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      allowsInlineMediaPlayback
      renderLoading={() => (
        <View style={[styles.center, { backgroundColor: colors.bg }]}>
          <ActivityIndicator color={colors.primaryLight} size="large" />
        </View>
      )}
      style={styles.fill}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'white' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
