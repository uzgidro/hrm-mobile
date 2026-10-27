import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import { onlyOfficeDeviceParams } from '@/utils/onlyOffice';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';
import { CHRONO_FILE_VIEWER_CONFIG } from '@/api/urls';
import { toApiError } from '@/api/errors';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ErrorState } from '@/components/StateViews';
import { OnlyOfficeFrame } from '@/components/OnlyOfficeFrame';
import { chronoKeys } from '../api/queries';

// A file of a «Topshiriqlar xronologiyasi» task in OnlyOffice, VIEW only —
// the same frame as the document library's viewer. The server answers 415 for
// anything OnlyOffice cannot open (archives, pictures); those never reach this
// screen, the list sends them to the browser to download instead.
export default function ChronoFileScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const fileId = Number(id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const { width } = useWindowDimensions();
  const deviceParams = onlyOfficeDeviceParams(Platform.OS, width);
  const { data: config, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...chronoKeys.all, 'viewer-config', fileId, deviceParams.device ?? null],
    queryFn: () => apiClient.get(CHRONO_FILE_VIEWER_CONFIG(fileId), { params: deviceParams }).then((r) => r.data),
    enabled: !!fileId,
    staleTime: 0,
    gcTime: 0,
    retry: false, // a 422 (unsupported type) is not worth retrying
  });

  // 415 = OnlyOffice cannot open this type; the list downloads such files, so
  // this only fires on a stale link.
  const unsupported = toApiError(error).status === 415;


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
