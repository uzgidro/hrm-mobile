import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';
import { FILE_EDITOR_CONFIG } from '@/api/urls';
import { toApiError } from '@/api/errors';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ErrorState } from '@/components/StateViews';
import { OnlyOfficeFrame } from '@/components/OnlyOfficeFrame';
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


  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title={name || t('documents.viewerTitle')} />

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
        <OnlyOfficeFrame config={config} errorLabel={t('documents.openError')} title={name || t('documents.viewerTitle')} />
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
