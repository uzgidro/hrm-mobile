// Ilova ichidagi ko'rsatkich: video qo'llanma (HTML5 pleyer) yoki veb-sahifa (yangilik maqolasi).
// Vebda WebView ishlamaydi — u yerda manzil yangi oynada ochiladi va ekran orqaga qaytadi.
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader, HeaderAction } from '@/components/ScreenHeader';
import { ErrorState } from '@/ui/StateViews';
import { guardWebViewNavigation, isTrustedAppUrl } from '@/lib/trustedUrl';
import { buildVideoHtml } from '../videoHtml';

export default function MediaViewerScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ kind?: string; url?: string; title?: string }>();
  const kind = params.kind === 'video' ? 'video' : 'page';
  const url = typeof params.url === 'string' ? params.url : '';
  // Faqat o'z domenimiz — begona sayt ilova ichida ochilmaydi (src/lib/trustedUrl).
  const safe = isTrustedAppUrl(url);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const source = useMemo(
    () => (kind === 'video' ? { html: buildVideoHtml(url), baseUrl: url } : { uri: url }),
    [kind, url],
  );
  const openOutside = () => {
    if (safe) void Linking.openURL(url);
  };

  useEffect(() => {
    if (Platform.OS === 'web' && safe) {
      void Linking.openURL(url);
      if (router.canGoBack()) router.back();
    }
  }, [safe, url]);

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={params.title || t(kind === 'video' ? 'videoGuide.title' : 'news.title')}
        right={safe ? <HeaderAction icon="globe" onPress={openOutside} accessibilityLabel={t('common.openInBrowser')} /> : undefined}
      />
      {!safe || failed ? (
        <ErrorState message={t('common.mediaLoadFailed')} onRetry={safe ? () => setFailed(false) : undefined} />
      ) : Platform.OS === 'web' ? null : (
        <View style={[styles.flex, kind === 'video' && styles.black]} testID="media-viewer">
          <WebView
            source={source}
            style={[styles.flex, kind === 'video' && styles.black]}
            originWhitelist={['https://*']}
            onShouldStartLoadWithRequest={guardWebViewNavigation}
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            onLoadEnd={() => setLoading(false)}
            onError={() => setFailed(true)}
            onHttpError={(e) => {
              if (kind === 'video' || e.nativeEvent.statusCode >= 500) setFailed(true);
            }}
          />
          {loading && (
            <View style={styles.loader} pointerEvents="none">
              <ActivityIndicator color={colors.primaryLight} />
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  black: { backgroundColor: 'black' },
  loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
